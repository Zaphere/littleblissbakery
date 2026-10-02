/* Proves the offline receipt reader really works, end to end, in a real browser:
   serve dist, draw a receipt on a canvas, hand it to the same Tesseract entry the
   app imports, and read the words back.

   This is the check that catches the failures unit tests cannot: a wrong
   workerPath, a corePath the library resolves to a file that does not exist, a
   language file the CDN path no longer serves. All of those only fail at runtime,
   in a browser, after a ~4 MB download.

   Run: npm run test:ocr */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4398;
const APP = `http://localhost:${PORT}/`;
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!CHROME) {
  console.error('No Chrome found — set CHROME_PATH to a Chrome/Chromium binary.');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return r; } catch {}
    await sleep(250);
  }
  throw new Error('timeout waiting for ' + url);
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let next = 1;
    ws.onopen = () => resolve({
      ws,
      send(method, params = {}, sessionId) {
        const id = next++;
        ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
        return new Promise((res, rej) => pending.set(id, { res, rej }));
      },
      close() { ws.close(); },
    });
    ws.onerror = (e) => reject(new Error('ws error ' + e.message));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
    };
  });
}

async function evaluate(cdp, sessionId, expression, timeoutMs = 120000) {
  const call = cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  const timer = new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate timed out')), timeoutMs));
  const r = await Promise.race([call, timer]);
  if (r.exceptionDetails) {
    throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
  }
  return r.result.value;
}

/* The chunk Vite emitted for the dynamic import('tesseract.js') is not named
   after the library, so find it by content — the same module the app will load. */
function findTesseractChunk() {
  const dir = path.resolve('dist/assets');
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.js')) continue;
    const body = readFileSync(path.join(dir, name), 'utf8');
    if (body.includes('createScheduler') && body.includes('loadLanguage')) return name;
  }
  return null;
}

const chunk = findTesseractChunk();
if (!chunk) {
  console.error('Could not find the tesseract.js chunk in dist/assets — run npm run build first.');
  process.exit(2);
}
const base = readFileSync(path.resolve('public/vendor/tesseract/6.0.1/manifest.json'), 'utf8');
const manifest = JSON.parse(base.replace(/^\/\*[\s\S]*?\*\/\s*/, ''));

const profile = path.join(os.tmpdir(), 'lb-ocr-test-' + Date.now());
let preview, chrome, cdp;
let failed = false;

try {
  preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
  });
  preview.stdout.on('data', (b) => process.stdout.write('   [preview] ' + b));
  preview.stderr.on('data', (b) => process.stdout.write('   [preview] ' + b));
  await waitFor(APP + 'index.html');
  console.log('1. preview server up on :' + PORT);

  chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=9223', '--user-data-dir=' + profile,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });

  const ver = await waitFor('http://127.0.0.1:9223/json/version');
  cdp = await connect((await ver.json()).webSocketDebuggerUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: APP });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await sleep(2500);
  console.log('2. page open, tesseract chunk: ' + chunk);

  const assetBase = '/vendor/tesseract/' + manifest.version;
  const result = await evaluate(cdp, sessionId, `(async () => {
    const assetBase = ${JSON.stringify(assetBase)};
    const missing = [];
    for (const file of ${JSON.stringify(manifest.files)}) {
      const r = await fetch(assetBase + '/' + file);
      if (!r.ok) missing.push(file + ' -> ' + r.status);
    }

    // A till slip drawn on a canvas: monospace, black on white, generous leading.
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 520;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.font = '34px "Courier New", monospace';
    const lines = ['CAKE FLOUR 25KG   340.00', 'BUTTER 500G        62.50', 'VANILLA EXTRACT 100ML 38.00'];
    lines.forEach((line, i) => ctx.fillText(line, 30, 90 + i * 90));
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));

    // Vite rewrites the app's \`import('tesseract.js')\` to hand back the CommonJS
    // exports object under one binding, so mirror that shape here rather than
    // assuming named exports.
    const mod = await import('/assets/${chunk}');
    const lib = mod.default ?? Object.values(mod)[0] ?? mod;
    const shape = { keys: Object.keys(mod), libKeys: Object.keys(lib ?? {}).slice(0, 8) };
    const createWorker = lib?.createWorker ?? lib?.default?.createWorker;
    if (typeof createWorker !== 'function') return { missing, shape, noCreateWorker: true };
    const statuses = [];
    const worker = await createWorker('eng', 1, {
      workerPath: assetBase + '/worker.min.js',
      corePath: assetBase,
      langPath: assetBase,
      logger: (m) => { if (m.status) statuses.push(m.status); },
    });
    await worker.setParameters({ tessedit_pageseg_mode: '4' });
    const { data } = await worker.recognize(blob);
    await worker.terminate();
    return { missing, shape, statuses, text: data.text };
  })()`);

  console.log('3. asset availability:', result.missing.length ? 'MISSING ' + result.missing.join(', ') : 'all files served');
  console.log('4. tesseract chunk exports:', JSON.stringify(result.shape));
  console.log('5. OCR read back:\n' + result.text.split('\n').filter(Boolean).map((l) => '     ' + l).join('\n'));

  const flat = result.text.toUpperCase().replace(/\s+/g, ' ');
  const checks = [
    ['no OCR asset missing', result.missing.length === 0],
    ['createWorker resolvable from the chunk', Array.isArray(result.shape?.libKeys) && result.shape.libKeys.includes('createWorker')],
    ['worker started', result.statuses.some((s) => /loading|initializing|recognizing/i.test(s))],
    ['read CAKE FLOUR', flat.includes('CAKE FLOUR')],
    ['read the price 340.00', flat.includes('340.00')],
    ['read BUTTER', flat.includes('BUTTER')],
    ['read VANILLA EXTRACT', flat.includes('VANILLA')],
  ];
  for (const [label, ok] of checks) console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`);

  const offlineReady = await evaluate(cdp, sessionId, `(async () => {
    const keys = await caches.keys();
    const runtime = keys.find((k) => k.startsWith('lb-runtime'));
    if (!runtime) return { runtime: false };
    const cache = await caches.open(runtime);
    const hits = (await cache.keys()).map((r) => new URL(r.url).pathname).filter((p) => p.includes('/vendor/tesseract/'));
    return { runtime: true, hits };
  })()`);
  console.log('6. runtime cache holds:', offlineReady.hits?.length ? offlineReady.hits.join(', ') : 'nothing (precache-only build)');
  const failures0 = checks.filter(([, ok]) => !ok);
  if (failures0.length) {
    failed = true;
    console.log(`\nFAIL — ${failures0.length} check(s) failed before the offline leg`);
  } else {
    /* The whole reason these files are self-hosted: pull the plug and scan again. */
    preview.kill('SIGKILL');
    await sleep(1500);
    let stillUp = false;
    try { stillUp = (await fetch(APP)).ok; } catch { stillUp = false; }
    if (stillUp) throw new Error('preview server survived SIGKILL');
    console.log('\n7. server killed — scanning again with no origin at all');

    const offlineText = await evaluate(cdp, sessionId, `(async () => {
      const assetBase = ${JSON.stringify(assetBase)};
      const mod = await import('/assets/${chunk}');
      const lib = mod.default ?? Object.values(mod)[0] ?? mod;
      const createWorker = lib?.createWorker ?? lib?.default?.createWorker;
      const worker = await createWorker('eng', 1, {
        workerPath: assetBase + '/worker.min.js',
        corePath: assetBase,
        langPath: assetBase,
      });
      const canvas = document.createElement('canvas');
      canvas.width = 900; canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.font = '34px "Courier New", monospace';
      ctx.fillText('COCOA POWDER 1KG 145.00', 30, 100);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      const { data } = await worker.recognize(blob);
      await worker.terminate();
      return data.text;
    })()`, 180000);

    const offlineFlat = offlineText.toUpperCase().replace(/\s+/g, ' ');
    console.log('   read back offline:\n' + offlineText.split('\n').filter(Boolean).map((l) => '     ' + l).join('\n'));
    const offlineChecks = [
      ['OFFLINE: scanned a new receipt', offlineFlat.includes('COCOA')],
      ['OFFLINE: read the price', offlineFlat.includes('145.00')],
    ];
    for (const [label, ok] of offlineChecks) console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`);
    const offlineFailures = offlineChecks.filter(([, ok]) => !ok);
    failed = offlineFailures.length > 0;
    console.log(failed ? `\nFAIL — ${offlineFailures.length} offline check(s) failed` : '\nPASS — offline OCR works end to end, including with no server at all');
  }
} catch (error) {
  failed = true;
  console.log('\nFAIL —', error.message);
} finally {
  try { cdp?.close(); } catch {}
  try { preview?.kill('SIGKILL'); } catch {}
  try { chrome?.kill('SIGKILL'); } catch {}
  if (existsSync(profile)) { try { rmSync(profile, { recursive: true, force: true }); } catch {} }
}
process.exit(failed ? 1 : 0);
