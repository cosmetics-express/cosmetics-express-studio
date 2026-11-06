import { randomUUID } from 'node:crypto';
import { atomic, nextMonth } from './local-db';
import type { Asset, Generation, Subscription } from './types';
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: string,
  ) {
    super(message);
  }
}
export function refreshLocalCycle(clinicId: string): Subscription {
  return atomic((db) => {
    let sub = db
      .prepare('SELECT * FROM subscriptions WHERE clinic_id=?')
      .get(clinicId) as unknown as Subscription;
    if (!sub) throw new DomainError('המנוי לא נמצא', 404);
    const now = new Date().toISOString();
    if (sub.cycle_end <= now) {
      let start = sub.cycle_end,
        end = nextMonth(new Date(start));
      while (end <= now) {
        start = end;
        end = nextMonth(new Date(start));
      }
      db.prepare(
        'UPDATE subscriptions SET used=0,bonus=0,cycle_start=?,cycle_end=? WHERE clinic_id=?',
      ).run(start, end, clinicId);
      sub = { ...sub, used: 0, bonus: 0, cycle_start: start, cycle_end: end };
    }
    // Reservations are short leases. Recover abandoned requests after a server restart.
    const stale = db
      .prepare(
        "SELECT id,cycle_start FROM ai_generations WHERE clinic_id=? AND status='pending' AND created_at<?",
      )
      .all(clinicId, new Date(Date.now() - 15 * 60000).toISOString()) as {
      id: string;
      cycle_start: string;
    }[];
    for (const g of stale) {
      db.prepare(
        "UPDATE ai_generations SET status='failed',credit_consumed=0,error='reservation_expired' WHERE id=?",
      ).run(g.id);
      if (g.cycle_start === sub.cycle_start) {
        db.prepare('UPDATE subscriptions SET used=MAX(0,used-1) WHERE clinic_id=?').run(clinicId);
        sub.used = Math.max(0, sub.used - 1);
      }
      db.prepare('INSERT INTO usage_events VALUES(?,?,?,?,?,?)').run(
        randomUUID(),
        clinicId,
        g.id,
        -1,
        'refund',
        now,
      );
    }
    return { ...sub };
  });
}
export function reserveLocal(
  clinicId: string,
  campaignId: string,
  key: string,
  prompt: string,
  inputs: Record<string, unknown>,
  version: string,
): Generation {
  refreshLocalCycle(clinicId);
  return atomic((db) => {
    const account = db.prepare('SELECT suspended FROM clinics WHERE id=?').get(clinicId) as
      { suspended: number } | undefined;
    if (!account || account.suspended) throw new DomainError('יצירת תמונות בחשבון זה הושהתה', 403);
    if (
      !db.prepare('SELECT id FROM campaigns WHERE id=? AND clinic_id=?').get(campaignId, clinicId)
    )
      throw new DomainError('הקמפיין לא נמצא', 404);
    const existing = db
      .prepare('SELECT * FROM ai_generations WHERE clinic_id=? AND idempotency_key=?')
      .get(clinicId, key);
    if (existing) {
      const g = existing as unknown as Generation;
      if (g.campaign_id !== campaignId) throw new DomainError('מפתח הבקשה כבר בשימוש', 409);
      return { ...g, reused: true };
    }
    const sub = db
      .prepare('SELECT * FROM subscriptions WHERE clinic_id=?')
      .get(clinicId) as unknown as Subscription;
    if (sub.status === 'suspended') throw new DomainError('המנוי הושהה', 403);
    const result = db
      .prepare('UPDATE subscriptions SET used=used+1 WHERE clinic_id=? AND used<allowance+bonus')
      .run(clinicId);
    if (!result.changes)
      throw new DomainError(
        'כל הקרדיטים למחזור זה נוצלו. אפשר להמשיך לערוך ולהוריד עיצובים קיימים.',
        402,
      );
    const g: Generation = {
      id: randomUUID(),
      clinic_id: clinicId,
      campaign_id: campaignId,
      idempotency_key: key,
      prompt_inputs: inputs,
      prompt,
      prompt_version: version,
      status: 'pending',
      credit_consumed: 1,
      error: null,
      cycle_start: sub.cycle_start,
      created_at: new Date().toISOString(),
    };
    db.prepare('INSERT INTO ai_generations VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(
      g.id,
      clinicId,
      campaignId,
      key,
      JSON.stringify(inputs),
      prompt,
      version,
      'pending',
      1,
      null,
      sub.cycle_start,
      g.created_at,
    );
    db.prepare('INSERT INTO usage_events VALUES(?,?,?,?,?,?)').run(
      randomUUID(),
      clinicId,
      g.id,
      1,
      'generation',
      g.created_at,
    );
    return g;
  });
}
export function completeLocal(g: Generation, asset: Asset) {
  atomic((db) => {
    const result = db
      .prepare(
        "UPDATE ai_generations SET status='succeeded' WHERE id=? AND clinic_id=? AND status='pending'",
      )
      .run(g.id, g.clinic_id);
    if (!result.changes) throw new DomainError('פג תוקף בקשת היצירה. הקרדיט הוחזר.', 409);
    db.prepare('INSERT INTO campaign_assets VALUES(?,?,?,?,?,?,?)').run(
      asset.id,
      g.clinic_id,
      g.campaign_id,
      g.id,
      asset.path,
      asset.kind,
      asset.created_at,
    );
    db.prepare('UPDATE campaigns SET active_asset_id=? WHERE id=? AND clinic_id=?').run(
      asset.id,
      g.campaign_id,
      g.clinic_id,
    );
  });
}
export function failLocal(g: Generation) {
  atomic((db) => {
    const result = db
      .prepare(
        "UPDATE ai_generations SET status='failed',credit_consumed=0,error='provider_failed' WHERE id=? AND clinic_id=? AND status='pending'",
      )
      .run(g.id, g.clinic_id);
    if (!result.changes) return;
    db.prepare(
      'UPDATE subscriptions SET used=MAX(0,used-1) WHERE clinic_id=? AND cycle_start=?',
    ).run(g.clinic_id, g.cycle_start);
    db.prepare('INSERT INTO usage_events VALUES(?,?,?,?,?,?)').run(
      randomUUID(),
      g.clinic_id,
      g.id,
      -1,
      'refund',
      new Date().toISOString(),
    );
  });
}
