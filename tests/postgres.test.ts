import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

test('PostgreSQL migration, RLS and production RPCs', async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  // Minimal Supabase-owned schemas. The application migration is executed unmodified.
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create schema storage;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  await db.exec(await readFile('supabase/migrations/001_studio.sql', 'utf8'));
  const userA = randomUUID(),
    userB = randomUUID();
  await db.query<Record<string, unknown>>(
    'insert into auth.users(id,raw_user_meta_data) values($1,$2),($3,$4)',
    [
      userA,
      JSON.stringify({ clinic_name: 'קליניקה א' }),
      userB,
      JSON.stringify({ clinic_name: 'קליניקה ב' }),
    ],
  );
  const own = await db.query<{ user_id: string; clinic_id: string }>(
    'select * from public.memberships',
  );
  const clinicA = own.rows.find((m) => m.user_id === userA)!.clinic_id,
    clinicB = own.rows.find((m) => m.user_id === userB)!.clinic_id;
  async function asUser(id: string) {
    await db.exec('reset role');
    await db.query<Record<string, unknown>>("select set_config('request.jwt.claim.sub',$1,false)", [
      id,
    ]);
    await db.exec('set role authenticated');
  }
  const campaignId = randomUUID();
  await asUser(userA);
  await t.test(
    'signup trigger creates isolated clinic, membership and 30-credit subscription',
    async () => {
      const c = await db.query<Record<string, unknown>>('select * from clinics');
      assert.equal(c.rows.length, 1);
      assert.equal(c.rows[0].id, clinicA);
      const s = await db.query<Record<string, unknown>>('select * from subscriptions');
      assert.equal(s.rows.length, 1);
      assert.equal(s.rows[0].allowance, 30);
      assert.equal(s.rows[0].used, 0);
      assert.equal(
        (await db.query<Record<string, unknown>>('select * from platform_admins')).rows.length,
        0,
      );
    },
  );
  await t.test(
    'campaign and landing are created atomically under the authenticated clinic',
    async () => {
      await db.query<Record<string, unknown>>('select create_campaign($1::jsonb,$2::jsonb)', [
        JSON.stringify({
          id: campaignId,
          title: 'כותרת לקמפיין',
          service: 'RF',
          objective: 'לידים',
          price: '99 ₪',
          second_offer: '',
          style: 'נקי',
          audience: 'מבוגרים',
          notes: '',
          direction: '',
          headline: 'כותרת',
          subheadline: 'משנה',
          cta: 'דברו איתנו',
          phone: '050-1234567',
          overlay_color: '#334455',
          clinic_id: clinicB,
        }),
        JSON.stringify({
          id: randomUUID(),
          headline: 'כותרת',
          subheadline: 'משנה',
          benefits: ['יחס אישי'],
          faq: [],
          cta: 'דברו איתנו',
          color: '#334455',
        }),
      ]);
      assert.equal(
        (await db.query<Record<string, unknown>>('select * from campaigns')).rows[0].clinic_id,
        clinicA,
      );
      assert.equal(
        (await db.query<Record<string, unknown>>('select * from landing_pages')).rows.length,
        1,
      );
    },
  );
  await t.test(
    'authenticated clients cannot alter counters, membership, suspension or the ledger',
    async () => {
      await assert.rejects(() => db.exec('update subscriptions set used=0'), /permission denied/);
      await assert.rejects(
        () => db.query<Record<string, unknown>>('update memberships set clinic_id=$1', [clinicB]),
        /permission denied/,
      );
      await assert.rejects(
        () => db.exec('update clinics set suspended=false'),
        /permission denied/,
      );
      await assert.rejects(
        () =>
          db.query<Record<string, unknown>>('update clinics set logo_path=$1', [
            `${clinicB}/private.png`,
          ]),
        /check constraint/,
      );
      await assert.rejects(
        () => db.exec("update ai_generations set status='failed'"),
        /permission denied/,
      );
      await assert.rejects(
        () =>
          db.query<Record<string, unknown>>('select complete_generation($1,$2,$3)', [
            randomUUID(),
            randomUUID(),
            'x',
          ]),
        /permission denied/,
      );
      await assert.rejects(
        () => db.query<Record<string, unknown>>('select fail_generation($1)', [randomUUID()]),
        /permission denied/,
      );
    },
  );
  let firstId = '';
  await t.test(
    'duplicate requests charge once and the 31st distinct generation is blocked',
    async () => {
      const key = randomUUID();
      const a = await db.query<{ reserve_generation: { id: string } }>(
        'select reserve_generation($1,$2,$3,$4::jsonb,$5)',
        [campaignId, key, 'prompt', '{}', 'v1'],
      );
      firstId = a.rows[0].reserve_generation.id;
      const b = await db.query<{ reserve_generation: { id: string; reused: boolean } }>(
        'select reserve_generation($1,$2,$3,$4::jsonb,$5)',
        [campaignId, key, 'prompt', '{}', 'v1'],
      );
      assert.equal(b.rows[0].reserve_generation.id, firstId);
      assert.equal(b.rows[0].reserve_generation.reused, true);
      for (let i = 1; i < 30; i++)
        await db.query<Record<string, unknown>>(
          'select reserve_generation($1,$2,$3,$4::jsonb,$5)',
          [campaignId, randomUUID(), 'prompt', '{}', 'v1'],
        );
      await assert.rejects(
        () =>
          db.query<Record<string, unknown>>('select reserve_generation($1,$2,$3,$4::jsonb,$5)', [
            campaignId,
            randomUUID(),
            'prompt',
            '{}',
            'v1',
          ]),
        /limit_reached/,
      );
      assert.equal(
        (await db.query<Record<string, unknown>>('select used from subscriptions')).rows[0].used,
        30,
      );
      // Editing at quota is allowed and cannot affect the ledger.
      await db.query<Record<string, unknown>>('update campaigns set headline=$1 where id=$2', [
        'כותרת אחרת',
        campaignId,
      ]);
      assert.equal(
        (await db.query<Record<string, unknown>>('select used from subscriptions')).rows[0].used,
        30,
      );
    },
  );
  await t.test('RLS hides another clinic, and cannot be bypassed by known IDs', async () => {
    await asUser(userB);
    assert.equal(
      (await db.query<Record<string, unknown>>('select * from campaigns')).rows.length,
      0,
    );
    assert.equal(
      (await db.query<Record<string, unknown>>('select * from ai_generations')).rows.length,
      0,
    );
    assert.equal(
      (await db.query<Record<string, unknown>>('select * from clinics')).rows[0].id,
      clinicB,
    );
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          'update campaigns set headline=$1 where id=$2 returning id',
          ['stolen', campaignId],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      () =>
        db.query<Record<string, unknown>>('select reserve_generation($1,$2,$3,$4::jsonb,$5)', [
          campaignId,
          randomUUID(),
          'prompt',
          '{}',
          'v1',
        ]),
      /unauthorized/,
    );
    await assert.rejects(
      () => db.query<Record<string, unknown>>('select admin_update_clinic($1,100,null)', [clinicB]),
      /forbidden/,
    );
    await assert.rejects(
      () => db.query<Record<string, unknown>>('select admin_accounts()'),
      /forbidden/,
    );
  });
  await t.test('only service role can refund, and retries cannot double-refund', async () => {
    await db.exec('reset role;set role service_role');
    await db.query<Record<string, unknown>>('select fail_generation($1)', [firstId]);
    await db.query<Record<string, unknown>>('select fail_generation($1)', [firstId]);
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          'select used from subscriptions where clinic_id=$1',
          [clinicA],
        )
      ).rows[0].used,
      29,
    );
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          "select count(*)::int as n from usage_events where generation_id=$1 and kind='refund'",
          [firstId],
        )
      ).rows[0].n,
      1,
    );
  });
  await t.test(
    'service completion writes asset/version and rejects a foreign storage path',
    async () => {
      await asUser(userA);
      const result = await db.query<{ reserve_generation: { id: string } }>(
        'select reserve_generation($1,$2,$3,$4::jsonb,$5)',
        [campaignId, randomUUID(), 'prompt', '{}', 'v1'],
      );
      const id = result.rows[0].reserve_generation.id;
      await db.exec('reset role;set role service_role');
      await assert.rejects(
        () =>
          db.query<Record<string, unknown>>('select complete_generation($1,$2,$3)', [
            id,
            randomUUID(),
            `${clinicB}/${id}.png`,
          ]),
        /invalid_generation/,
      );
      const assetId = randomUUID();
      await db.query<Record<string, unknown>>('select complete_generation($1,$2,$3)', [
        id,
        assetId,
        `${clinicA}/${id}.png`,
      ]);
      assert.equal(
        (
          await db.query<Record<string, unknown>>(
            'select active_asset_id from campaigns where id=$1',
            [campaignId],
          )
        ).rows[0].active_asset_id,
        assetId,
      );
      await db.query<Record<string, unknown>>('select fail_generation($1)', [id]);
      assert.equal(
        (
          await db.query<Record<string, unknown>>(
            'select used from subscriptions where clinic_id=$1',
            [clinicA],
          )
        ).rows[0].used,
        30,
      );
    },
  );
  await t.test('admin grants and suspension are guarded, recorded and enforced', async () => {
    await db.exec('reset role');
    await db.query<Record<string, unknown>>('insert into platform_admins values($1)', [userA]);
    await asUser(userA);
    await db.query<Record<string, unknown>>('select admin_update_clinic($1,5,true)', [clinicA]);
    assert.equal(
      (await db.query<Record<string, unknown>>('select bonus from subscriptions')).rows[0].bonus,
      5,
    );
    await assert.rejects(
      () =>
        db.query<Record<string, unknown>>('select reserve_generation($1,$2,$3,$4::jsonb,$5)', [
          campaignId,
          randomUUID(),
          'prompt',
          '{}',
          'v1',
        ]),
      /account_suspended/,
    );
    const accounts = await db.query<{ admin_accounts: unknown[] }>('select admin_accounts()');
    assert.equal(accounts.rows[0].admin_accounts.length, 2);
  });
  await db.close();
});
