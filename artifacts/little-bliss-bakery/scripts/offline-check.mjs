/* End-to-end offline check: serve dist, open it in headless Chrome, let the
   service worker install, then kill the server and reload. If the app still
   boots, offline works. */
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4399;
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
const log = (...a) => console.log(...a);

async function waitFor(url, tries = 60) {
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
    const sessions = new Map();
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
      if (msg.sessionId) sessions.get(msg.sessionId)?.(msg);
    };
  });
}

async function evaluate(cdp, sessionId, expression, timeoutMs = 12000) {
  const call = cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  const timer = new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate timed out: ' + expression.slice(0, 80))), timeoutMs));
  const r = await Promise.race([call, timer]);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
}

const profile = path.join(os.tmpdir(), 'lb-sw-test-' + Date.now());
let preview, chrome, cdp;
let failed = false;

try {
  // Spawn vite directly so the child PID is killable, on a port nothing else owns.
  preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
  });
  preview.stdout.on('data', (b) => process.stdout.write('   [preview] ' + b));
  preview.stderr.on('data', (b) => process.stderr.write('   [preview] ' + b));
  await waitFor(APP + 'index.html');
  const html = await (await fetch(APP)).text();
  if (!html.includes('Little Bliss')) throw new Error('wrong app served on :' + PORT);
  log('1. preview server up on :' + PORT);

  chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=9222', '--user-data-dir=' + profile,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });

  const ver = await waitFor('http://127.0.0.1:9222/json/version');
  const { webSocketDebuggerUrl } = await ver.json();
  cdp = await connect(webSocketDebuggerUrl);
  log('2. chrome attached');

  const { targetId } = await cdp.send('Target.createTarget', { url: APP });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  log('3. page target created at', APP);

  await sleep(5000);
  const where = await evaluate(cdp, sessionId, 'location.href + " | " + document.readyState');
  log('   landed on:', where);

  const online = {
    rendered: await evaluate(cdp, sessionId, `!!document.getElementById('root') && document.getElementById('root').childElementCount > 0`),
    title: await evaluate(cdp, sessionId, 'document.title'),
    swState: await evaluate(cdp, sessionId, `
      (async () => {
        const withTimeout = (promise, ms) => Promise.race([
          promise,
          new Promise((resolve) => setTimeout(() => resolve('__timeout__'), ms)),
        ]);
        const existing = await navigator.serviceWorker.getRegistration();
        const reg = await withTimeout(navigator.serviceWorker.ready, 8000);
        const keys = await caches.keys();
        const name = keys.find((k) => k.startsWith('lb-precache'));
        const cached = name ? (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname) : [];
        const runtimeName = keys.find((k) => k.startsWith('lb-runtime'));
        const runtimeHosts = runtimeName
          ? [...new Set((await (await caches.open(runtimeName)).keys()).map((r) => new URL(r.url).host))]
          : [];
        return {
          registered: !!existing,
          activeState: existing && existing.active ? existing.active.state : null,
          waitingState: existing && existing.waiting ? existing.waiting.state : null,
          readyTimedOut: reg === '__timeout__',
          scope: reg && reg.scope,
          keys, cached,
          runtimeHosts,
          controller: !!navigator.serviceWorker.controller,
        };
      })()
    `),
  };
  log('4. online load:', JSON.stringify(online, null, 2));

  if (!online.rendered) throw new Error('app did not render while online');
  if (!online.swState.controller) throw new Error('service worker never took control');
  if (!online.swState.cached.includes('/fonts/fonts.css')) throw new Error('fonts.css was not precached');
  if (!online.swState.cached.some((entry) => entry.endsWith('.woff2'))) throw new Error('no .woff2 files precached');
  if (online.swState.runtimeHosts.length) {
    throw new Error('cross-origin requests happened: ' + online.swState.runtimeHosts.join(', '));
  }

  // Pull the plug: no more origin at all.
  preview.kill('SIGKILL');
  await sleep(1200);
  let stillUp = false;
  try { stillUp = (await fetch(APP)).ok; } catch { stillUp = false; }
  if (stillUp) throw new Error('preview server survived SIGKILL — cannot test offline');
  log('   origin confirmed dead');
  log('4. server killed — origin unreachable');

  await cdp.send('Page.reload', { ignoreCache: false }, sessionId);
  await sleep(4000);

  const offline = {
    rendered: await evaluate(cdp, sessionId, `document.getElementById('root').childElementCount > 0`),
    title: await evaluate(cdp, sessionId, 'document.title'),
    bodyText: await evaluate(cdp, sessionId, `(document.body.innerText || '').slice(0, 160)`),
    fromCache: await evaluate(cdp, sessionId, `
      (async () => {
        const keys = await caches.keys();
        const shell = await caches.match('/index.html');
        return { keys, shellCached: !!shell };
      })()
    `),
  };
  log('5. OFFLINE reload:', JSON.stringify(offline, null, 2));

  if (!offline.rendered) throw new Error('OFFLINE: app did not render');
  if (!offline.fromCache.shellCached) throw new Error('OFFLINE: index.html was not in cache');

  // A deep link must also come back through the navigation fallback.
  await cdp.send('Page.navigate', { url: APP + 'orders' }, sessionId);
  await sleep(2500);
  const deep = await evaluate(cdp, sessionId, `document.getElementById('root').childElementCount > 0`);
  log('6. OFFLINE deep link /orders rendered:', deep);
  if (!deep) throw new Error('OFFLINE: /orders did not render');

  // Typography must survive with the network gone too, not just the shell.
  const fonts = await evaluate(cdp, sessionId, `
    (async () => {
      await Promise.all([
        document.fonts.load('400 16px "DM Sans"'),
        document.fonts.load('700 16px "DM Sans"'),
        document.fonts.load('600 32px "Fraunces"'),
        document.fonts.load('500 14px "IBM Plex Mono"'),
      ]);
      return {
        dm400: document.fonts.check('400 16px "DM Sans"'),
        dm700: document.fonts.check('700 16px "DM Sans"'),
        fraunces: document.fonts.check('600 32px "Fraunces"'),
        mono: document.fonts.check('500 14px "IBM Plex Mono"'),
        crossOrigin: performance.getEntriesByType('resource')
          .map((e) => new URL(e.name).origin)
          .filter((origin) => origin !== location.origin),
      };
    })()
  `);
  log('7. OFFLINE fonts:', JSON.stringify(fonts, null, 2));
  if (!fonts.dm400 || !fonts.dm700 || !fonts.fraunces || !fonts.mono) {
    throw new Error('OFFLINE: a font face did not load from the cache');
  }
  if (fonts.crossOrigin.length) {
    throw new Error('OFFLINE: unexpected cross-origin requests: ' + [...new Set(fonts.crossOrigin)].join(', '));
  }

  log('\nPASS — offline boot, deep link, assets and typography all verified');
} catch (error) {
  failed = true;
  log('\nFAIL —', error.message);
} finally {
  try { cdp?.close(); } catch {}
  try { preview?.kill('SIGKILL'); } catch {}
  try { chrome?.kill('SIGKILL'); } catch {}
  if (existsSync(profile)) { try { rmSync(profile, { recursive: true, force: true }); } catch {} }
}
process.exit(failed ? 1 : 0);
