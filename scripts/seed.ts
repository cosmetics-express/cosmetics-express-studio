import { seedDemo } from '../lib/local-db';
if (process.env.APP_MODE !== 'demo') {
  console.error('Seed is demo-only. Run APP_MODE=demo npm run seed.');
  process.exit(1);
}
seedDemo();
console.log('Demo seeded (idempotent). Login: hello@demo.studio / StudioDemo2026!');
