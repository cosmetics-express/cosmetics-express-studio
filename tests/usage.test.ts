import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  localDb,
  createLocalAccount,
  nextMonth,
  verifyPassword,
  hashPassword,
  seedDemo,
} from '../lib/local-db';
import { reserveLocal, failLocal, completeLocal, refreshLocalCycle } from '../lib/local-usage';
import { buildPrompt, PROMPT_VERSION } from '../lib/prompts';
import { toCsv } from '../lib/csv';
import { editorSchema, leadSchema } from '../lib/validation';
process.env.APP_MODE = 'demo';
process.env.STUDIO_DATA_DIR = mkdtempSync(join(tmpdir(), 'studio-unit-'));
function fixture() {
  const { clinicId } = createLocalAccount(
    `${randomUUID()}@test.local`,
    'Password123!',
    'בדיקת קליניקה',
  );
  const id = randomUUID(),
    now = new Date().toISOString();
  localDb()
    .prepare(
      'INSERT INTO campaigns(id,clinic_id,title,service,objective,style,audience,headline,phone,overlay_color,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
    )
    .run(
      id,
      clinicId,
      'קמפיין בדיקה',
      'טיפול פנים RF',
      'לידים חדשים',
      'יוקרתי',
      'מבוגרים',
      'כותרת',
      '050-1234567',
      '#6d7969',
      now,
    );
  return { clinicId, id };
}
function reserve(f: { clinicId: string; id: string }, key = randomUUID()) {
  return reserveLocal(f.clinicId, f.id, key, 'prompt', { service: 'טיפול פנים' }, PROMPT_VERSION);
}
test('exactly 30 reservations are allowed; the 31st is blocked with no extra ledger row', () => {
  const f = fixture();
  for (let i = 0; i < 30; i++) reserve(f);
  assert.throws(() => reserve(f), /כל הקרדיטים/);
  assert.equal(refreshLocalCycle(f.clinicId).used, 30);
  assert.equal(
    (
      localDb()
        .prepare('SELECT COUNT(*) AS n FROM usage_events WHERE clinic_id=?')
        .get(f.clinicId) as { n: number }
    ).n,
    30,
  );
});
test('four independent database connections cannot overspend a clinic quota', async () => {
  const f = fixture();
  const counts = await Promise.all(
    Array.from(
      { length: 4 },
      () =>
        new Promise<number>((resolve, reject) => {
          const child = spawn(
            process.execPath,
            ['--import', 'tsx', 'tests/helpers/reserve-worker.ts', f.clinicId, f.id],
            { env: process.env },
          );
          let out = '',
            err = '';
          child.stdout.on('data', (b) => (out += String(b)));
          child.stderr.on('data', (b) => (err += String(b)));
          child.on('error', reject);
          child.on('close', (code) => (code === 0 ? resolve(Number(out)) : reject(new Error(err))));
        }),
    ),
  );
  assert.equal(
    counts.reduce((a, b) => a + b, 0),
    30,
  );
  assert.equal(refreshLocalCycle(f.clinicId).used, 30);
});
test('idempotency reuses a pending reservation and cannot be applied to another campaign', () => {
  const f = fixture(),
    key = randomUUID(),
    g = reserve(f, key),
    repeat = reserve(f, key) as typeof g & { reused: boolean };
  assert.equal(g.id, repeat.id);
  assert.equal(repeat.reused, true);
  assert.equal(refreshLocalCycle(f.clinicId).used, 1);
  const other = fixture();
  assert.throws(() => reserveLocal(f.clinicId, other.id, key, '', {}, 'v1'), /לא נמצא/);
});
test('failure refunds only once and retains the failed generation record', () => {
  const f = fixture(),
    g = reserve(f);
  failLocal(g);
  failLocal(g);
  assert.equal(refreshLocalCycle(f.clinicId).used, 0);
  const r = localDb()
    .prepare('SELECT status,credit_consumed FROM ai_generations WHERE id=?')
    .get(g.id);
  assert.equal(r?.status, 'failed');
  assert.equal(r?.credit_consumed, 0);
  assert.equal(
    (
      localDb()
        .prepare("SELECT COUNT(*) AS n FROM usage_events WHERE generation_id=? AND kind='refund'")
        .get(g.id) as { n: number }
    ).n,
    1,
  );
});
test('completion stores a version and cannot be refunded or finalized twice', () => {
  const f = fixture(),
    g = reserve(f),
    asset = {
      id: randomUUID(),
      clinic_id: f.clinicId,
      campaign_id: f.id,
      generation_id: g.id,
      path: '/art/laser.svg',
      kind: 'demo',
      created_at: new Date().toISOString(),
    };
  completeLocal(g, asset);
  failLocal(g);
  assert.equal(refreshLocalCycle(f.clinicId).used, 1);
  assert.equal(
    localDb().prepare('SELECT active_asset_id FROM campaigns WHERE id=?').get(f.id)
      ?.active_asset_id,
    asset.id,
  );
  assert.throws(() => completeLocal(g, asset), /פג תוקף/);
});
test('monthly rollover resets usage and bonus and a late refund cannot reduce the new cycle', () => {
  const f = fixture(),
    g = reserve(f);
  localDb()
    .prepare('UPDATE subscriptions SET cycle_start=?,cycle_end=?,bonus=5 WHERE clinic_id=?')
    .run('2020-01-01T00:00:00.000Z', '2020-02-01T00:00:00.000Z', f.clinicId);
  const sub = refreshLocalCycle(f.clinicId);
  assert.equal(sub.used, 0);
  assert.equal(sub.bonus, 0);
  assert.ok(sub.cycle_end > new Date().toISOString());
  reserve(f);
  failLocal(g);
  assert.equal(refreshLocalCycle(f.clinicId).used, 1);
});
test('abandoned pending requests expire, refund and cannot later finalize', () => {
  const f = fixture(),
    g = reserve(f);
  localDb()
    .prepare('UPDATE ai_generations SET created_at=? WHERE id=?')
    .run(new Date(Date.now() - 16 * 60000).toISOString(), g.id);
  assert.equal(refreshLocalCycle(f.clinicId).used, 0);
  assert.throws(
    () =>
      completeLocal(g, {
        id: randomUUID(),
        clinic_id: f.clinicId,
        campaign_id: f.id,
        generation_id: g.id,
        path: 'x',
        kind: 'demo',
        created_at: new Date().toISOString(),
      }),
    /פג תוקף/,
  );
});
test('suspension blocks reservations and leaves existing campaigns intact', () => {
  const f = fixture();
  localDb().prepare('UPDATE clinics SET suspended=1 WHERE id=?').run(f.clinicId);
  assert.throws(() => reserve(f), /הושהתה/);
  assert.ok(localDb().prepare('SELECT id FROM campaigns WHERE id=?').get(f.id));
});
test('cross-clinic relationships cannot be inserted', () => {
  const a = fixture(),
    b = fixture();
  assert.throws(
    () =>
      localDb()
        .prepare('INSERT INTO campaign_assets VALUES(?,?,?,?,?,?,?)')
        .run(randomUUID(), b.clinicId, a.id, null, 'x', 'demo', new Date().toISOString()),
    /FOREIGN KEY/,
  );
});
test('month calculations clamp calendar boundaries', () => {
  assert.equal(nextMonth(new Date('2024-01-31T12:00:00.000Z')), '2024-02-29T12:00:00.000Z');
});
test('passwords are salted and verified, never stored in clear text', () => {
  const a = hashPassword('Test123!'),
    b = hashPassword('Test123!');
  assert.notEqual(a, b);
  assert.ok(verifyPassword('Test123!', a));
  assert.equal(verifyPassword('wrong', a), false);
});
test('prompt requests text-free negative space and omits editable copy and price', () => {
  const p = buildPrompt(
    { service: 'RF', style: 'נקי', audience: 'adults', direction: 'soft light', notes: '' },
    { color: '#123456', description: 'clinic' },
  );
  assert.match(p, /negative space/);
  assert.match(p, /No Hebrew text/);
  assert.match(p, /adults only/);
  assert.doesNotMatch(p, /199/);
});
test('CSV protects spreadsheet formula execution and preserves Hebrew and quoted notes', () => {
  const csv = toCsv([
    ['שם', 'הערה'],
    ['נועה', '=HYPERLINK("evil")'],
    ['שירה', 'a,b\nc'],
  ]);
  assert.ok(csv.startsWith('\ufeff'));
  assert.match(csv, /"'=HYPERLINK\(""evil""\)"/);
  assert.match(csv, /"a,b\nc"/);
});
test('free edit payload cannot smuggle visual changes or usage fields; leads require explicit consent', () => {
  const result = editorSchema.parse({
    headline: 'כותרת',
    subheadline: '',
    price: '99 ₪',
    cta: 'התקשרו',
    phone: '050-1234567',
    overlay_color: '#445566',
    text_color: '#ffffff',
    alignment: 'right',
    text_position: 0,
    layout: 'bottom',
    format: 'post',
    used: 0,
    direction: 'new visual',
  });
  assert.equal('used' in result, false);
  assert.equal('direction' in result, false);
  assert.equal(
    leadSchema.safeParse({ name: 'נועה', phone: '050-1234567', consent: false }).success,
    false,
  );
});
test('demo seed is repeatable and marks assets as demo without consuming credits', () => {
  seedDemo();
  seedDemo();
  const u = localDb()
    .prepare('SELECT clinic_id FROM memberships WHERE user_id=(SELECT id FROM users WHERE email=?)')
    .get('hello@demo.studio') as { clinic_id: string };
  assert.equal(refreshLocalCycle(u.clinic_id).used, 0);
  assert.equal(
    (
      localDb()
        .prepare('SELECT COUNT(*) AS n FROM campaigns WHERE clinic_id=?')
        .get(u.clinic_id) as { n: number }
    ).n,
    3,
  );
});
