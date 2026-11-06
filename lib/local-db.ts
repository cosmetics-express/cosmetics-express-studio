import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

export const dataDir = () => resolve(process.env.STUDIO_DATA_DIR || '.data');
let connection: DatabaseSync | undefined;
export function localDb() {
  if (process.env.APP_MODE !== 'demo')
    throw new Error('Local database is only available in explicit demo mode');
  if (connection) return connection;
  const file = resolve(dataDir(), 'studio.sqlite');
  mkdirSync(dirname(file), { recursive: true });
  connection = new DatabaseSync(file);
  connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL COLLATE NOCASE, password_hash TEXT NOT NULL, is_admin INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clinics(id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '050-1234567', city TEXT NOT NULL DEFAULT 'תל אביב', description TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '#6d7969', logo_path TEXT, suspended INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memberships(user_id TEXT PRIMARY KEY REFERENCES users(id), clinic_id TEXT NOT NULL REFERENCES clinics(id));
    CREATE TABLE IF NOT EXISTS subscriptions(clinic_id TEXT PRIMARY KEY REFERENCES clinics(id), plan TEXT NOT NULL DEFAULT 'starter', allowance INTEGER NOT NULL DEFAULT 30, bonus INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0 CHECK(used>=0), cycle_start TEXT NOT NULL, cycle_end TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'trial');
    CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL REFERENCES clinics(id), title TEXT NOT NULL, service TEXT NOT NULL, objective TEXT NOT NULL, price TEXT NOT NULL DEFAULT '', second_offer TEXT NOT NULL DEFAULT '', style TEXT NOT NULL, audience TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', direction TEXT NOT NULL DEFAULT '', headline TEXT NOT NULL, subheadline TEXT NOT NULL DEFAULT '', cta TEXT NOT NULL DEFAULT 'לתיאום פגישת ייעוץ', phone TEXT NOT NULL, overlay_color TEXT NOT NULL, text_color TEXT NOT NULL DEFAULT '#ffffff', alignment TEXT NOT NULL DEFAULT 'right', text_position INTEGER NOT NULL DEFAULT 0, layout TEXT NOT NULL DEFAULT 'bottom', format TEXT NOT NULL DEFAULT 'post', active_asset_id TEXT, created_at TEXT NOT NULL, UNIQUE(id,clinic_id));
    CREATE TABLE IF NOT EXISTS ai_generations(id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, campaign_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, prompt_inputs TEXT NOT NULL, prompt TEXT NOT NULL, prompt_version TEXT NOT NULL, status TEXT NOT NULL, credit_consumed INTEGER NOT NULL DEFAULT 1, error TEXT, cycle_start TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(clinic_id,idempotency_key), UNIQUE(id,clinic_id), FOREIGN KEY(campaign_id,clinic_id) REFERENCES campaigns(id,clinic_id));
    CREATE TABLE IF NOT EXISTS campaign_assets(id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, campaign_id TEXT NOT NULL, generation_id TEXT, path TEXT NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(id,clinic_id), FOREIGN KEY(campaign_id,clinic_id) REFERENCES campaigns(id,clinic_id), FOREIGN KEY(generation_id,clinic_id) REFERENCES ai_generations(id,clinic_id));
    CREATE TABLE IF NOT EXISTS landing_pages(id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, campaign_id TEXT NOT NULL UNIQUE, slug TEXT UNIQUE NOT NULL, headline TEXT NOT NULL, subheadline TEXT NOT NULL, benefits TEXT NOT NULL, faq TEXT NOT NULL, cta TEXT NOT NULL, color TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, FOREIGN KEY(campaign_id,clinic_id) REFERENCES campaigns(id,clinic_id));
    CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL, campaign_id TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'new', notes TEXT NOT NULL DEFAULT '', consent INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, FOREIGN KEY(campaign_id,clinic_id) REFERENCES campaigns(id,clinic_id));
    CREATE TABLE IF NOT EXISTS brand_assets(id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL REFERENCES clinics(id), path TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS usage_events(id TEXT PRIMARY KEY, clinic_id TEXT NOT NULL REFERENCES clinics(id), generation_id TEXT, amount INTEGER NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL, resets_at INTEGER NOT NULL);
  `);
  return connection;
}
export function atomic<T>(fn: (db: DatabaseSync) => T): T {
  const db = localDb();
  if (db.isTransaction) return fn(db);
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function hashPassword(password: string) {
  const salt = randomUUID();
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function nextMonth(start: Date) {
  const next = new Date(start);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, last));
  return next.toISOString();
}
export function createLocalAccount(
  email: string,
  password: string,
  clinicName: string,
  admin = false,
) {
  return atomic((db) => {
    const userId = randomUUID(),
      clinicId = randomUUID(),
      now = new Date().toISOString();
    db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(
      userId,
      email,
      hashPassword(password),
      Number(admin),
    );
    db.prepare('INSERT INTO clinics(id,name,created_at) VALUES(?,?,?)').run(
      clinicId,
      clinicName,
      now,
    );
    db.prepare('INSERT INTO memberships VALUES(?,?)').run(userId, clinicId);
    db.prepare('INSERT INTO subscriptions(clinic_id,cycle_start,cycle_end) VALUES(?,?,?)').run(
      clinicId,
      now,
      nextMonth(new Date(now)),
    );
    return { userId, clinicId };
  });
}
export function seedDemo() {
  return atomic((db) => {
    if (db.prepare('SELECT id FROM users WHERE email=?').get('hello@demo.studio')) return;
    const { clinicId } = createLocalAccount(
      'hello@demo.studio',
      'StudioDemo2026!',
      'קליניקת נועה',
      true,
    );
    const now = new Date().toISOString();
    db.prepare('UPDATE clinics SET description=? WHERE id=?').run(
      'קליניקה לאסתטיקה מתקדמת. יחס אישי, מקצועיות ויופי שמרגיש טבעי.',
      clinicId,
    );
    const items = [
      {
        id: 'demo-laser',
        title: 'קיץ חלק מתחיל כאן',
        service: 'הסרת שיער בלייזר',
        price: 'החל מ־199 ₪',
        style: 'יוקרתי',
        image: 'laser',
        sub: 'הסרת שיער בלייזר · עכשיו זה הזמן שלך',
      },
      {
        id: 'demo-facial',
        title: 'לתת לעור שלך לזהור',
        service: 'טיפול פנים RF',
        price: '349 ₪',
        style: 'רך',
        image: 'facial',
        sub: 'טיפול פנים מתקדם · רגע של התחדשות',
      },
      {
        id: 'demo-skin',
        title: 'היופי שבטבע שלך',
        service: 'חידוש העור',
        price: '299 ₪',
        style: 'נקי',
        image: 'skin',
        sub: 'טיפולי עור בהתאמה אישית',
      },
    ];
    for (const [i, c] of items.entries()) {
      const id = `${clinicId}-${c.id}`,
        assetId = randomUUID();
      db.prepare(
        `INSERT INTO campaigns(id,clinic_id,title,service,objective,price,style,audience,headline,subheadline,phone,overlay_color,active_asset_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        id,
        clinicId,
        c.title,
        c.service,
        'לידים חדשים',
        c.price,
        c.style,
        'נשים וגברים בגילאי 25–55',
        c.title,
        c.sub,
        '050-1234567',
        ['#46564a', '#8c6155', '#6b7160'][i],
        assetId,
        new Date(Date.now() - i * 86400000).toISOString(),
      );
      db.prepare('INSERT INTO campaign_assets VALUES(?,?,?,?,?,?,?)').run(
        assetId,
        clinicId,
        id,
        null,
        `/art/${c.image}.svg`,
        'demo',
        now,
      );
      db.prepare('INSERT INTO landing_pages VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(
        randomUUID(),
        clinicId,
        id,
        `${c.id}-${clinicId.slice(0, 8)}`,
        c.title,
        c.sub,
        JSON.stringify(['התאמה אישית לצרכים שלך', 'צוות מקצועי ומנוסה', 'אווירה נעימה ויחס אישי']),
        JSON.stringify([
          {
            question: 'איך מתחילים?',
            answer:
              'משאירים פרטים והצוות שלנו ייצור קשר לתיאום פגישת ייעוץ. ההתאמה לטיפול תיקבע בייעוץ מקצועי.',
          },
        ]),
        'לתיאום פגישת ייעוץ',
        '#6d7969',
        1,
        now,
      );
    }
    const campaigns = db.prepare('SELECT id FROM campaigns WHERE clinic_id=?').all(clinicId) as {
      id: string;
    }[];
    for (const [i, name] of [
      'מיכל לוי',
      'דנה כהן',
      'שירה אברהם',
      'יעל ישראלי',
      'אור בן דוד',
    ].entries()) {
      db.prepare('INSERT INTO leads VALUES(?,?,?,?,?,?,?,?,?,?)').run(
        randomUUID(),
        clinicId,
        campaigns[i % 3].id,
        name,
        '050-0000000',
        '',
        ['new', 'contacted', 'appointment', 'new', 'no_answer'][i],
        'נתוני הדגמה בלבד',
        1,
        new Date(Date.now() - i * 3600000).toISOString(),
      );
    }
  });
}
export function localRateLimit(key: string, limit: number, windowMs: number) {
  return atomic((db) => {
    const now = Date.now();
    const row = db.prepare('SELECT * FROM rate_limits WHERE key=?').get(key) as
      { count: number; resets_at: number } | undefined;
    if (!row || row.resets_at <= now) {
      db.prepare('INSERT OR REPLACE INTO rate_limits VALUES(?,?,?)').run(key, 1, now + windowMs);
      return true;
    }
    if (row.count >= limit) return false;
    db.prepare('UPDATE rate_limits SET count=count+1 WHERE key=?').run(key);
    return true;
  });
}
