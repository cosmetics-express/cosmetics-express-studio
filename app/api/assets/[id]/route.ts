import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { context } from '@/lib/auth';
import { get, clinic } from '@/lib/store';
import { publicLanding } from '@/lib/public';
import { isDemo, serviceClient } from '@/lib/supabase';
import { dataDir } from '@/lib/local-db';
import type { Asset } from '@/lib/types';
export const runtime = 'nodejs';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let path: string | null = null,
    owner: string | null = null;
  const slug = req.nextUrl.searchParams.get('landing');
  if (slug) {
    const data = await publicLanding(slug);
    if (data) {
      owner = data.clinic.id;
      if (id === 'logo') path = data.clinic.logo_path;
      else if (data.asset?.id === id) path = data.asset.path;
    }
  } else {
    const ctx = await context();
    if (ctx) {
      owner = ctx.clinicId;
      if (id === 'logo') path = (await clinic(ctx)).logo_path;
      else path = (await get<Asset>(ctx, 'campaign_assets', id))?.path || null;
    }
  }
  if (!path) return new NextResponse('Not found', { status: 404 });
  try {
    if (path.startsWith('/art/') && isDemo()) {
      if (!['/art/laser.svg', '/art/facial.svg', '/art/skin.svg'].includes(path))
        return new NextResponse('Not found', { status: 404 });
      return new NextResponse(await readFile(resolve('public', path.slice(1))), {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, no-store' },
      });
    }
    if (path.includes('..') || !owner || !path.startsWith(`${owner}/`))
      return new NextResponse('Not found', { status: 404 });
    let bytes: Uint8Array;
    if (isDemo()) bytes = await readFile(resolve(dataDir(), path));
    else {
      const { data, error } = await serviceClient().storage.from('studio-assets').download(path);
      if (error || !data) throw error;
      bytes = new Uint8Array(await data.arrayBuffer());
    }
    const contentType = path.endsWith('.png')
      ? 'image/png'
      : path.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';
    return new NextResponse(bytes as BodyInit, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return new NextResponse('Image unavailable', { status: 404 });
  }
}
