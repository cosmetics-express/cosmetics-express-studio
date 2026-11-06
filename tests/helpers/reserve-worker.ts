import { reserveLocal } from '../../lib/local-usage';
import { randomUUID } from 'node:crypto';
const [clinicId, id] = process.argv.slice(2);
let successes = 0;
for (let i = 0; i < 12; i++) {
  try {
    reserveLocal(clinicId, id, randomUUID(), 'concurrent test', {}, 'v1');
    successes++;
  } catch (e) {
    if ((e as { status?: number }).status !== 402) throw e;
  }
}
process.stdout.write(String(successes));
