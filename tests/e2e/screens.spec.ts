import { test, expect } from '@playwright/test';
test('all main routes render and logo, preview, admin and logout controls work', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const path of ['/', '/pricing', '/signup', '/login']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
  }
  await page.getByRole('button', { name: 'כניסה לסטודיו לדוגמה' }).click();
  await expect(page).toHaveURL('/app');
  for (const path of [
    '/app/campaigns',
    '/app/leads',
    '/app/billing',
    '/app/settings',
    '/app/admin',
  ]) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
  }
  await page.goto('/app/settings');
  await page.locator('input[type=file]').setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByText('הלוגו נשמר', { exact: true })).toBeVisible();
  expect((await page.request.get('/api/assets/logo')).status()).toBe(200);
  await page.getByRole('button', { name: 'הסרת הלוגו' }).click();
  await expect(page.getByText('הלוגו הוסר מהקליניקה', { exact: true })).toBeVisible();
  expect((await page.request.get('/api/assets/logo')).status()).toBe(404);
  await page.getByLabel('שם הקליניקה', { exact: true }).fill('קליניקת נועה');
  await page.getByRole('button', { name: 'שמירת פרופיל הקליניקה' }).click();
  await expect(
    page.getByText('פרופיל הקליניקה נשמר. קמפיינים חדשים ישתמשו בפרטים האלו.'),
  ).toBeVisible();
  const campaigns = await page.request.get('/app/campaigns');
  expect(campaigns.status()).toBe(200);
  await page.goto('/app/campaigns');
  await page.locator('.campaign-card-info h3').first().click();
  await expect(page.locator('h1')).toBeVisible();
  await page.getByRole('link', { name: 'עריכת דף הנחיתה' }).click();
  await page.getByRole('button', { name: 'תצוגה מקדימה', exact: true }).click();
  await expect(page.getByRole('button', { name: 'תצוגה מקדימה · הטופס אינו פעיל' })).toBeDisabled();
  await page.goto('/app/admin');
  const first = page.getByRole('row').filter({ hasText: 'קליניקת נועה' });
  await first.getByRole('spinbutton').fill('2');
  await first.getByRole('button', { name: 'הענקה' }).click();
  await expect(page.getByText('קרדיטי הבונוס נוספו למחזור הנוכחי', { exact: true })).toBeVisible();
  const usage = await page.request.get('/api/usage').then((r) => r.json());
  expect(usage.bonus).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'יציאה מהחשבון' }).click();
  await expect(page).toHaveURL('/login');
  expect((await page.request.get('/api/usage')).status()).toBe(401);
  expect(errors).toEqual([]);
});
