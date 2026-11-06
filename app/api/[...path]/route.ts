import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { context, createSession, logout } from '@/lib/auth';
import { isDemo, supabase, serviceClient } from '@/lib/supabase';
import { localDb, seedDemo, createLocalAccount, verifyPassword, atomic } from '@/lib/local-db';
import { list, get, update, insert, clinic } from '@/lib/store';
import { createCampaign } from '@/lib/campaigns';
import { generate, storeLogo } from '@/lib/generation';
import { subscription } from '@/lib/usage';
import { publicLanding } from '@/lib/public';
import { DomainError, refreshLocalCycle } from '@/lib/local-usage';
import {
  authSchema,
  editorSchema,
  clinicSchema,
  landingSchema,
  leadSchema,
  leadUpdateSchema,
} from '@/lib/validation';
import { jsonBody, protectOrigin, rateLimit, failure } from '@/lib/http';
import { toCsv } from '@/lib/csv';
import { leadStatuses, type Asset, type Lead, type Campaign, type Landing } from '@/lib/types';
export const runtime = 'nodejs';
export const maxDuration = 180;
type Params = { params: Promise<{ path: string[] }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    protectOrigin(req);
    const { path } = await params;
    const route = path.join('/');
    if (route === 'auth/demo') {
      if (!isDemo()) throw new DomainError('לא נמצא', 404);
      await rateLimit(req, 'demo', 30, 60000);
      seedDemo();
      const user = localDb()
        .prepare('SELECT id FROM users WHERE email=?')
        .get('hello@demo.studio') as { id: string };
      await createSession(user.id);
      return NextResponse.json({ redirect: '/app' });
    }
    if (route === 'auth/logout') {
      await logout();
      return NextResponse.json({ redirect: '/login' });
    }
    if (route === 'auth/login' || route === 'auth/signup') {
      await rateLimit(req, 'auth', 15, 15 * 60000);
      const input = authSchema.parse(await jsonBody(req)),
        email = input.email.toLowerCase();
      if (isDemo()) {
        seedDemo();
        if (route === 'auth/signup') {
          if (!input.clinic || input.clinic.length < 2)
            throw new DomainError('יש להזין שם קליניקה');
          if (localDb().prepare('SELECT id FROM users WHERE email=?').get(email))
            throw new DomainError('לא ניתן ליצור חשבון עם פרטים אלו');
          const { userId } = createLocalAccount(email, input.password, input.clinic);
          await createSession(userId);
        } else {
          const user = localDb().prepare('SELECT * FROM users WHERE email=?').get(email) as
            { id: string; password_hash: string } | undefined;
          if (!user || !verifyPassword(input.password, user.password_hash))
            throw new DomainError('האימייל או הסיסמה אינם נכונים', 401);
          await createSession(user.id);
        }
      } else {
        const client = await supabase();
        if (route === 'auth/signup') {
          if (!input.clinic || input.clinic.length < 2)
            throw new DomainError('יש להזין שם קליניקה');
          const { data, error } = await client.auth.signUp({
            email,
            password: input.password,
            options: {
              data: { clinic_name: input.clinic },
              emailRedirectTo: `${process.env.APP_URL}/auth/confirm`,
            },
          });
          if (error) throw new DomainError('לא ניתן ליצור חשבון עם פרטים אלו');
          if (!data.session)
            return NextResponse.json({
              message: 'שלחנו קישור לאימות האימייל. לאחר האימות אפשר להתחבר.',
            });
        } else {
          const { error } = await client.auth.signInWithPassword({
            email,
            password: input.password,
          });
          if (error) throw new DomainError('האימייל או הסיסמה אינם נכונים', 401);
        }
      }
      return NextResponse.json({ redirect: '/app' });
    }
    if (path[0] === 'public' && path[2] === 'leads') {
      await rateLimit(req, `lead:${path[1]}`, 8, 10 * 60000);
      const input = leadSchema.parse(await jsonBody(req));
      const data = await publicLanding(path[1]);
      if (!data) throw new DomainError('העמוד לא נמצא', 404);
      if (isDemo())
        localDb()
          .prepare('INSERT INTO leads VALUES(?,?,?,?,?,?,?,?,?,?)')
          .run(
            randomUUID(),
            data.clinic.id,
            data.campaign.id,
            input.name,
            input.phone,
            input.email,
            'new',
            '',
            1,
            new Date().toISOString(),
          );
      else {
        const { error } = await serviceClient().from('leads').insert({
          clinic_id: data.clinic.id,
          campaign_id: data.campaign.id,
          name: input.name,
          phone: input.phone,
          email: input.email,
          consent: true,
        });
        if (error) throw error;
      }
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    const ctx = await context();
    if (!ctx) throw new DomainError('יש להתחבר לחשבון', 401);
    if (route === 'campaigns') {
      const id = await createCampaign(ctx, await jsonBody(req));
      return NextResponse.json({ id }, { status: 201 });
    }
    if (path[0] === 'campaigns' && path[2] === 'generate') {
      await rateLimit(req, `generation:${ctx.clinicId}`, 12, 60000);
      const { key, ...direction } = z
        .object({
          key: z.uuid(),
          style: z.enum(['יוקרתי', 'נשי', 'נועז', 'אלגנטי', 'נקי', 'רך']).optional(),
          direction: z.string().max(500).optional(),
          notes: z.string().max(1000).optional(),
        })
        .parse(await jsonBody(req));
      return NextResponse.json(await generate(ctx, path[1], key, direction));
    }
    if (route === 'clinic/logo') {
      if (Number(req.headers.get('content-length') || 0) > 2.2 * 1024 * 1024)
        throw new DomainError('התמונה גדולה מדי', 413);
      const form = await req.formData(),
        file = form.get('file');
      if (!(file instanceof File)) throw new DomainError('יש לבחור תמונה');
      const stored = await storeLogo(ctx, file);
      await insert(ctx, 'brand_assets', { ...stored, created_at: new Date().toISOString() });
      if (isDemo())
        localDb()
          .prepare('UPDATE clinics SET logo_path=? WHERE id=?')
          .run(stored.path, ctx.clinicId);
      else {
        const { error } = await (
          await supabase()
        )
          .from('clinics')
          .update({ logo_path: stored.path })
          .eq('id', ctx.clinicId);
        if (error) throw error;
      }
      return NextResponse.json({ ok: true });
    }
    if (route === 'admin') {
      if (!ctx.admin) throw new DomainError('אין הרשאה', 403);
      const input = z
        .object({
          clinicId: z.uuid(),
          credits: z.number().int().min(1).max(1000).optional(),
          suspended: z.boolean().optional(),
        })
        .parse(await jsonBody(req));
      if (!input.credits && input.suspended === undefined) throw new DomainError('לא נבחרה פעולה');
      if (isDemo()) {
        refreshLocalCycle(input.clinicId);
        atomic((db) => {
          if (!db.prepare('SELECT id FROM clinics WHERE id=?').get(input.clinicId))
            throw new DomainError('לא נמצא', 404);
          if (input.credits) {
            db.prepare('UPDATE subscriptions SET bonus=bonus+? WHERE clinic_id=?').run(
              input.credits,
              input.clinicId,
            );
            db.prepare('INSERT INTO usage_events VALUES(?,?,?,?,?,?)').run(
              randomUUID(),
              input.clinicId,
              null,
              input.credits,
              'admin_grant',
              new Date().toISOString(),
            );
          }
          if (input.suspended !== undefined)
            db.prepare('UPDATE clinics SET suspended=? WHERE id=?').run(
              Number(input.suspended),
              input.clinicId,
            );
        });
      } else {
        const { error } = await (
          await supabase()
        ).rpc('admin_update_clinic', {
          p_clinic: input.clinicId,
          p_credits: input.credits || 0,
          p_suspended: input.suspended ?? null,
        });
        if (error) throw error;
      }
      return NextResponse.json({ ok: true });
    }
    throw new DomainError('לא נמצא', 404);
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    protectOrigin(req);
    const ctx = await context();
    if (!ctx) throw new DomainError('יש להתחבר לחשבון', 401);
    const { path } = await params;
    if (path[0] === 'campaigns' && path.length === 2) {
      if (!(await get<Campaign>(ctx, 'campaigns', path[1]))) throw new DomainError('לא נמצא', 404);
      await update(ctx, 'campaigns', path[1], editorSchema.parse(await jsonBody(req)));
    } else if (path[0] === 'campaigns' && path[2] === 'asset') {
      const { assetId } = z.object({ assetId: z.uuid() }).parse(await jsonBody(req));
      const asset = await get<Asset>(ctx, 'campaign_assets', assetId);
      if (!asset || asset.campaign_id !== path[1]) throw new DomainError('לא נמצא', 404);
      await update(ctx, 'campaigns', path[1], { active_asset_id: assetId });
    } else if (path[0] === 'landing' && path.length === 2) {
      if (!(await get<Landing>(ctx, 'landing_pages', path[1])))
        throw new DomainError('לא נמצא', 404);
      await update(ctx, 'landing_pages', path[1], landingSchema.parse(await jsonBody(req)));
    } else if (path[0] === 'leads' && path.length === 2) {
      if (!(await get<Lead>(ctx, 'leads', path[1]))) throw new DomainError('לא נמצא', 404);
      await update(ctx, 'leads', path[1], leadUpdateSchema.parse(await jsonBody(req)));
    } else if (path[0] === 'clinic') {
      const input = clinicSchema.parse(await jsonBody(req));
      if (isDemo())
        localDb()
          .prepare('UPDATE clinics SET name=?,phone=?,city=?,description=?,color=? WHERE id=?')
          .run(input.name, input.phone, input.city, input.description, input.color, ctx.clinicId);
      else {
        const { error } = await (
          await supabase()
        )
          .from('clinics')
          .update(input)
          .eq('id', ctx.clinicId);
        if (error) throw error;
      }
    } else throw new DomainError('לא נמצא', 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const ctx = await context();
    if (!ctx) throw new DomainError('יש להתחבר לחשבון', 401);
    const { path } = await params,
      route = path.join('/');
    if (route === 'usage') return NextResponse.json(await subscription(ctx));
    if (route === 'leads/export') {
      const leads = await list<Lead>(ctx, 'leads');
      const csv = toCsv([
        ['שם', 'טלפון', 'אימייל', 'סטטוס', 'הערות', 'תאריך'],
        ...leads.map((l) => [
          l.name,
          l.phone,
          l.email,
          leadStatuses[l.status],
          l.notes,
          l.created_at,
        ]),
      ]);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="studio-leads.csv"',
          'Cache-Control': 'no-store',
        },
      });
    }
    if (route === 'clinic') return NextResponse.json(await clinic(ctx));
    throw new DomainError('לא נמצא', 404);
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    protectOrigin(req);
    const ctx = await context();
    if (!ctx) throw new DomainError('יש להתחבר לחשבון', 401);
    if ((await params).path.join('/') !== 'clinic/logo') throw new DomainError('לא נמצא', 404);
    if (isDemo())
      localDb().prepare('UPDATE clinics SET logo_path=NULL WHERE id=?').run(ctx.clinicId);
    else {
      const { error } = await (
        await supabase()
      )
        .from('clinics')
        .update({ logo_path: null })
        .eq('id', ctx.clinicId);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
