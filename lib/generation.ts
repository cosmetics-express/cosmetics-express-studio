import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildPrompt, PROMPT_VERSION } from './prompts';
import { clinic, get, list } from './store';
import { dataDir } from './local-db';
import { reserveLocal, completeLocal, failLocal, DomainError } from './local-usage';
import { isDemo, supabase, serviceClient } from './supabase';
import type { Asset, Campaign, Context, Generation } from './types';

export async function generate(
  ctx: Context,
  campaignId: string,
  key: string,
  overrides: Partial<Pick<Campaign, 'style' | 'direction' | 'notes'>> = {},
) {
  const saved = await get<Campaign>(ctx, 'campaigns', campaignId);
  if (!saved) throw new DomainError('הקמפיין לא נמצא', 404);
  const campaign = { ...saved, ...overrides };
  if (!isDemo() && !process.env.OPENAI_API_KEY)
    throw new DomainError(
      'שירות יצירת התמונות טרם חובר. פנו למפעילי הפלטפורמה. לא חויב קרדיט.',
      503,
    );
  const profile = await clinic(ctx),
    prompt = buildPrompt(campaign, profile);
  const inputs = {
    service: campaign.service,
    style: campaign.style,
    audience: campaign.audience,
    direction: campaign.direction,
    notes: campaign.notes,
    provider: isDemo() ? 'demo' : 'openai',
  };
  let g: Generation;
  if (isDemo()) g = reserveLocal(ctx.clinicId, campaignId, key, prompt, inputs, PROMPT_VERSION);
  else {
    const { data, error } = await (
      await supabase()
    ).rpc('reserve_generation', {
      p_campaign: campaignId,
      p_key: key,
      p_prompt: prompt,
      p_inputs: inputs,
      p_version: PROMPT_VERSION,
    });
    if (error)
      throw new DomainError(
        error.message.includes('limit_reached')
          ? 'כל הקרדיטים למחזור זה נוצלו. אפשר להמשיך לערוך עיצובים קיימים.'
          : 'לא ניתן ליצור תמונה בחשבון זה',
        error.message.includes('limit_reached') ? 402 : 403,
      );
    g = data as Generation;
  }
  if (g.campaign_id !== campaignId) throw new DomainError('מפתח הבקשה כבר בשימוש', 409);
  if (g.status === 'succeeded')
    return {
      generation: g,
      asset: (await list<Asset>(ctx, 'campaign_assets')).find((a) => a.generation_id === g.id),
    };
  if (g.status === 'failed')
    throw new DomainError(
      'הבקשה הקודמת נכשלה. אפשר לאשר יצירה חדשה ולנסות שוב.',
      409,
      'generation_failed',
    );
  // Only the request that owns the fresh reservation may invoke the provider.
  if ((g as Generation & { reused?: boolean }).reused)
    throw new DomainError(
      'היצירה כבר בתהליך. אפשר לבדוק שוב בעוד רגע באמצעות אותו כפתור.',
      409,
      'generation_pending',
    );
  try {
    let path: string;
    if (isDemo()) {
      path = `/art/${campaign.service.includes('לייזר') ? 'laser' : campaign.service.includes('RF') ? 'facial' : 'skin'}.svg`;
    } else {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
          prompt,
          size: '1024x1536',
          quality: 'high',
          n: 1,
        }),
        signal: AbortSignal.timeout(150000),
      });
      if (!response.ok) throw new Error(`Image provider returned ${response.status}`);
      const data = await response.json();
      const b64 = data.data?.[0]?.b64_json;
      if (typeof b64 !== 'string' || b64.length > 40_000_000)
        throw new Error('Invalid image payload');
      const buffer = Buffer.from(b64, 'base64');
      if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
        throw new Error('Expected PNG from image provider');
      path = `${ctx.clinicId}/${g.id}.png`;
      const { error } = await serviceClient()
        .storage.from('studio-assets')
        .upload(path, buffer, { contentType: 'image/png', upsert: false });
      if (error) throw new Error('Image storage failed');
    }
    const asset: Asset = {
      id: randomUUID(),
      clinic_id: ctx.clinicId,
      campaign_id: campaignId,
      generation_id: g.id,
      path,
      kind: isDemo() ? 'demo' : 'ai',
      created_at: new Date().toISOString(),
    };
    if (isDemo()) completeLocal(g, asset);
    else {
      const { error } = await serviceClient().rpc('complete_generation', {
        p_generation: g.id,
        p_asset: asset.id,
        p_path: path,
      });
      if (error) throw new Error('Could not finalize generation');
    }
    return { generation: { ...g, status: 'succeeded' }, asset };
  } catch (error) {
    if (isDemo()) failLocal(g);
    else {
      // A lost RPC response can happen after the commit. Reconcile before reporting a refund.
      const { data: state, error: stateError } = await serviceClient()
        .from('ai_generations')
        .select('status')
        .eq('id', g.id)
        .eq('clinic_id', ctx.clinicId)
        .single();
      if (stateError)
        throw new DomainError(
          'מצב היצירה אינו זמין כרגע. נסו לבדוק שוב בעוד רגע; לא תישלח יצירה נוספת.',
          503,
          'generation_pending',
        );
      if (state.status === 'succeeded') {
        const asset = (await list<Asset>(ctx, 'campaign_assets')).find(
          (a) => a.generation_id === g.id,
        );
        if (asset) return { generation: { ...g, status: 'succeeded' }, asset };
        throw new DomainError(
          'היצירה הושלמה. נסו לרענן את העמוד כדי לטעון את התמונה.',
          503,
          'generation_pending',
        );
      }
      const { error: refundError } = await serviceClient().rpc('fail_generation', {
        p_generation: g.id,
      });
      if (refundError)
        throw new DomainError(
          'היצירה נכשלה. הקרדיט שמור זמנית וישוחרר אוטומטית בתוך 15 דקות.',
          502,
          'generation_pending',
        );
    }
    // Never log prompts, tokens, provider bodies, or personal data.
    console.error('Image generation failed', {
      generationId: g.id,
      reason: error instanceof Error ? error.name : 'Error',
    });
    throw new DomainError(
      'יצירת התמונה נכשלה. הקרדיט שוחרר. אפשר לנסות שוב.',
      502,
      'generation_failed',
    );
  }
}
export async function storeLogo(ctx: Context, file: File) {
  if (file.size > 2 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new DomainError('יש לבחור PNG, JPG או WebP עד 2MB');
  const buffer = Buffer.from(await file.arrayBuffer());
  const valid =
    (file.type === 'image/png' &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (file.type === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) ||
    (file.type === 'image/webp' &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP');
  if (!valid) throw new DomainError('תוכן הקובץ אינו תואם לפורמט התמונה');
  const id = randomUUID(),
    ext = file.type.split('/')[1],
    path = `${ctx.clinicId}/logo-${id}.${ext}`;
  if (isDemo()) {
    await mkdir(resolve(dataDir(), ctx.clinicId), { recursive: true });
    await writeFile(resolve(dataDir(), path), buffer);
  } else {
    const { error } = await serviceClient()
      .storage.from('studio-assets')
      .upload(path, buffer, { contentType: file.type });
    if (error) throw new Error('Logo storage failed');
  }
  return { id, path };
}
