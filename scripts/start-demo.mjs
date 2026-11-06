import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = Number(portIndex >= 0 ? args[portIndex + 1] : 3000);
const url = `http://localhost:${port}`;
const noOpen = args.includes('--no-open');
const env = {
  ...process.env,
  APP_MODE: 'demo',
  APP_URL: url,
  NODE_ENV: 'development',
  STUDIO_DATA_DIR: resolve(root, '.data'),
};

async function command(file, parameters) {
  const child = spawn(file, parameters, { cwd: root, env, stdio: 'inherit' });
  return new Promise((resolveCommand, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolveCommand();
      else
        reject(new Error(`הפעולה נעצרה (קוד ${code ?? 'לא ידוע'}). בדקו את ההודעה שמעל ונסו שוב.`));
    });
  });
}

function npmCli() {
  const bin = dirname(process.execPath);
  const candidates = [
    process.env.npm_execpath,
    resolve(bin, 'node_modules/npm/bin/npm-cli.js'),
    resolve(bin, '../lib/node_modules/npm/bin/npm-cli.js'),
    resolve(bin, '../node_modules/npm/bin/npm-cli.js'),
  ];
  return candidates.find((path) => path && existsSync(path));
}

async function ensurePortFree() {
  const probe = createServer();
  await new Promise((accept, reject) => {
    probe.once('error', () =>
      reject(
        new Error(
          `פורט ${port} כבר בשימוש. סגרו חלון דמו קודם, או הריצו: npm run demo -- --port 3001`,
        ),
      ),
    );
    probe.listen(port, '127.0.0.1', () => probe.close(accept));
  });
}

function openBrowser() {
  const file =
    process.platform === 'win32'
      ? 'rundll32.exe'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open';
  const parameters =
    process.platform === 'win32'
      ? ['url.dll,FileProtocolHandler', `${url}/login`]
      : [`${url}/login`];
  execFile(file, parameters, (error) => {
    if (error) console.log(`פתחו בדפדפן: ${url}/login`);
  });
}

async function main() {
  if (Number(process.versions.node.split('.')[0]) !== 24) {
    throw new Error(
      'נדרשת Node.js 24 LTS. התקינו אותה מ־https://nodejs.org/en/download ואז פתחו את קובץ ההפעלה מחדש.',
    );
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('מספר פורט לא תקין.');
  await ensurePortFree();
  const fingerprint = createHash('sha256')
    .update(readFileSync(resolve(root, 'package-lock.json')))
    .update(`${process.platform}:${process.arch}:24`)
    .digest('hex');
  const marker = resolve(root, 'node_modules/.studio-demo-lock');
  if (
    !existsSync(marker) ||
    readFileSync(marker, 'utf8') !== fingerprint ||
    !existsSync(resolve(root, 'node_modules/next/dist/bin/next'))
  ) {
    const cli = npmCli();
    if (!cli)
      throw new Error(
        'npm לא נמצא. התקינו Node.js 24 עם npm, או פתחו Terminal בתיקייה והריצו npm run demo.',
      );
    console.log(
      '\nמתקינים את רכיבי המערכת. בהפעלה הראשונה נדרש חיבור לאינטרנט; זה עשוי לקחת כמה דקות.\n',
    );
    await command(process.execPath, [cli, 'ci', '--include=dev']);
    writeFileSync(marker, fingerprint);
  }
  console.log('\nמכינים את נתוני הדמו. נתונים קיימים לא יימחקו.\n');
  await command(process.execPath, ['--import', 'tsx', 'scripts/seed.ts']);
  console.log('\nזהו דמו מקומי: אין חיוב, אין קריאה ל־OpenAI, והתמונות הן איורים לדוגמה.');
  console.log(`המערכת תיפתח כאן: ${url}/login`);
  console.log('בחרו ״כניסה לסטודיו לדוגמה״. השאירו את החלון הזה פתוח בזמן השימוש.\n');
  const server = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
    { cwd: root, env, stdio: 'inherit' },
  );
  let ended = false;
  const completion = new Promise((accept, reject) => {
    server.once('error', reject);
    server.once('exit', (code) => {
      ended = true;
      accept(code);
    });
  });
  const stop = () => server.kill('SIGTERM');
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  let ready = false;
  try {
    for (let attempt = 0; attempt < 120 && !ended; attempt++) {
      try {
        const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
        const data = await response.json();
        if (response.ok && data.ok && data.mode === 'demo') {
          ready = true;
          break;
        }
      } catch {
        /* Wait for Next.js to compile the health route. */
      }
      await new Promise((accept) => setTimeout(accept, 500));
    }
    if (!ready && !ended) {
      stop();
      throw new Error('הדמו לא השלים את ההפעלה. בדקו את ההודעות שמעל ונסו שוב.');
    }
    if (ready) {
      console.log(`\nהדמו מוכן לשימוש: ${url}/login\n`);
      if (!noOpen) openBrowser();
    }
    const code = await completion;
    if (code && code !== 0) process.exitCode = 1;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    if (!ended) stop();
  }
}

main().catch((error) => {
  console.error(`\nלא ניתן להפעיל את הדמו: ${error.message}\n`);
  process.exitCode = 1;
});
