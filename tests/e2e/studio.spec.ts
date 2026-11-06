import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const origin = { Origin: 'http://localhost:3000' };
test('Hebrew studio: create, confirm generation, edit free, export formats, publish and receive a lead', async ({
  page,
}) => {
  const errors: string[] = [];
  const leadName = `לקוחה בדיקת קצה ${Date.now()}`;
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/login');
  await page.getByRole('button', { name: 'כניסה לסטודיו לדוגמה' }).click();
  await expect(page).toHaveURL('/app');
  await expect(page.getByRole('heading', { name: 'יום יפה ליצור משהו חדש ✳' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'יצירת קמפיין חדש', exact: true }).first().click();
  await page.getByLabel('שם הקמפיין / כותרת המבצע').fill('הזמן שלך לזהור');
  await page.getByLabel('מחיר / הצעה', { exact: true }).fill('249 ₪');
  await page.getByRole('button', { name: 'ממשיכים לכיוון העיצובי' }).click();
  await page.getByRole('button', { name: 'רך', exact: true }).click();
  await page.getByLabel('כיוון ויזואלי', { exact: true }).fill('תאורה רכה, אסתטיקה נקייה');
  await page.getByRole('button', { name: 'ממשיכים לכיוון העיצובי' }).click();
  await page.getByRole('button', { name: 'יצירת טיוטה ומעבר לסטודיו' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const id = page.url().split('/campaigns/')[1].split('/')[0];
  let usage = await page.request.get('/api/usage').then((r) => r.json());
  const before = usage.used;
  // Simulate a lost response after the server has successfully consumed one credit.
  const generationRoute = `**/api/campaigns/${id}/generate`;
  let dropped = false;
  await page.route(generationRoute, async (route) => {
    if (!dropped) {
      dropped = true;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('checkbox', { name: 'ברור לי שזו יצירה חדשה שתשתמש בקרדיט אחד' }).check();
  await page.getByRole('button', { name: 'כן, יוצרים עיצוב חדש' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'לא ניתן לאשר את מצב הבקשה',
  );
  usage = await page.request.get('/api/usage').then((r) => r.json());
  expect(usage.used).toBe(before + 1);
  // Retrying the same confirmation recovers the existing result, rather than spending again.
  await page.getByRole('button', { name: 'כן, יוצרים עיצוב חדש' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.unroute(generationRoute);
  usage = await page.request.get('/api/usage').then((r) => r.json());
  expect(usage.used).toBe(before + 1);
  await page.getByLabel('כותרת ראשית', { exact: true }).fill('היופי שלך מתחיל כאן');
  await page.getByRole('button', { name: 'שמירת שינויים' }).click();
  await expect(page.getByText('כל השינויים נשמרו', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/editor-desktop.png', fullPage: true });
  for (const format of ['פוסט', 'סטורי', 'ריבוע']) {
    await page.getByRole('button', { name: format, exact: true }).click();
    const wait = page.waitForEvent('download');
    await page.getByRole('button', { name: 'הורדת העיצוב' }).click();
    const dl = await wait;
    const file = await dl.path();
    expect(file).toBeTruthy();
    const bytes = await readFile(file!);
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.readUInt32BE(16)).toBe(1080);
    expect(bytes.readUInt32BE(20)).toBe(
      format === 'סטורי' ? 1920 : format === 'ריבוע' ? 1080 : 1350,
    );
  }
  await page.getByLabel('סוג קובץ להורדה').selectOption('jpg');
  const jpgWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'הורדת העיצוב' }).click();
  const jpg = await jpgWait;
  expect((await readFile((await jpg.path())!)).subarray(0, 3).toString('hex')).toBe('ffd8ff');
  usage = await page.request.get('/api/usage').then((r) => r.json());
  expect(usage.used).toBe(before + 1);
  await page.getByRole('link', { name: 'ממשיכים לדף הנחיתה' }).click();
  await page.getByLabel('דף הנחיתה מפורסם ופתוח לציבור').check();
  await page.getByRole('button', { name: 'שמירת דף הנחיתה' }).click();
  await expect(page.getByText('דף הנחיתה נשמר ופורסם', { exact: true })).toBeVisible();
  await page.goto(`/p/campaign-${id}`);
  await page.getByLabel('שם מלא').fill(leadName);
  await page.getByLabel('מספר טלפון').fill('050-9876543');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'לתיאום פגישת ייעוץ' }).click();
  await expect(page.getByRole('heading', { name: 'תודה, הפרטים בדרך אלינו.' })).toBeVisible();
  await page.goto('/app/leads');
  const row = page.getByRole('row').filter({ hasText: leadName });
  await expect(row).toBeVisible();
  await row.getByRole('combobox').selectOption('appointment');
  await expect(row.getByRole('combobox')).toHaveValue('appointment');
  const csv = await page.request.get('/api/leads/export');
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(leadName);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'פתיחת תפריט' }).click();
  await expect(page.getByRole('link', { name: 'ניהול לידים', exact: false }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
test('API enforces authentication, tenant isolation, validation, CSRF and idempotency', async ({
  browser,
}) => {
  const a = await browser.newContext({ baseURL: 'http://localhost:3000' }),
    b = await browser.newContext({ baseURL: 'http://localhost:3000' }),
    anonymous = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const authA = a.request,
    authB = b.request;
  const signup = async (api: typeof authA, clinic: string) => {
    const r = await api.post('/api/auth/signup', {
      headers: origin,
      data: { email: `${crypto.randomUUID()}@example.com`, password: 'SafePassword123!', clinic },
    });
    expect(r.status()).toBe(200);
  };
  await signup(authA, 'קליניקה א');
  await signup(authB, 'קליניקה ב');
  const values = {
    title: 'בדיקת הפרדה',
    service: 'טיפול פנים RF',
    objective: 'לידים חדשים',
    price: '99 ₪',
    second_offer: '',
    style: 'נקי',
    audience: 'מבוגרים',
    notes: '',
    direction: '',
  };
  const created = await authA.post('/api/campaigns', { headers: origin, data: values });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  expect((await anonymous.request.get('/api/usage')).status()).toBe(401);
  expect(
    (
      await authB.post(`/api/campaigns/${id}/generate`, {
        headers: origin,
        data: { key: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await authA.post('/api/campaigns', {
        headers: { Origin: 'https://evil.example' },
        data: values,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await authA.post('/api/campaigns', { headers: origin, data: { ...values, title: '' } })
    ).status(),
  ).toBe(422);
  const edit = {
    headline: 'כותרת חדשה',
    subheadline: '',
    price: '88 ₪',
    cta: 'דברו איתנו',
    phone: '050-1234567',
    overlay_color: '#334455',
    text_color: '#ffffff',
    alignment: 'right',
    text_position: 0,
    layout: 'bottom',
    format: 'post',
  };
  expect(
    (await authB.patch(`/api/campaigns/${id}`, { headers: origin, data: edit })).status(),
  ).toBe(404);
  expect(
    (
      await authA.post('/api/admin', {
        headers: origin,
        data: { clinicId: crypto.randomUUID(), credits: 5 },
      })
    ).status(),
  ).toBe(403);
  // Retrying a successful request must not invoke generation or charge twice.
  const key = crypto.randomUUID();
  const g = await authA.post(`/api/campaigns/${id}/generate`, { headers: origin, data: { key } });
  expect(g.status()).toBe(200);
  const again = await authA.post(`/api/campaigns/${id}/generate`, {
    headers: origin,
    data: { key },
  });
  expect(again.status()).toBe(200);
  expect((await authA.get('/api/usage').then((r) => r.json())).used).toBe(1);
  const generated = await g.json();
  expect((await authB.get(`/api/assets/${generated.asset.id}`)).status()).toBe(404);
  expect((await anonymous.request.get(`/api/assets/${generated.asset.id}`)).status()).toBe(404);
  const empty = await authB.get('/api/leads/export');
  expect(await empty.text()).not.toContain('לקוחה בדיקת קצה');
  const pageB = await b.newPage();
  await pageB.goto(`/app/campaigns/${id}/editor`);
  await expect(pageB.getByRole('heading', { name: 'העמוד הזה עוד לא נוצר.' })).toBeVisible();
  await Promise.all([a.close(), b.close(), anonymous.close()]);
});
