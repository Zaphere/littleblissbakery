/* Confirms the order form no longer asks for Discount, Delivery fee or Amount
   paid, and that a new order still saves without them. Run once by hand:
     node scripts/order-form-check.mjs

   Removing inputs is easy; the risk is a form that looks right but cannot be
   submitted, or one that silently keeps writing the old values. So this checks
   the fields are gone, the remaining payment fields survived, and the invoice
   actually reaches the list. */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PORT = 4417;
const APP = `http://localhost:${PORT}`;
const STORE_KEY = 'little-bliss-store-v1';

const CHROME = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean).find((c) => existsSync(c));

if (!CHROME) { console.error('No Chrome found — set CHROME_PATH.'); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    let nextId = 0;
    socket.onopen = () => resolve({
      send(method, params = {}, sessionId) {
        return new Promise((res, rej) => {
          const id = ++nextId;
          pending.set(id, { res, rej });
          socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
        });
      },
      close() { try { socket.close(); } catch {} },
    });
    socket.onerror = (e) => reject(new Error('WebSocket: ' + e.message));
    socket.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result);
      }
    };
  });
}

async function evaluate(cdp, sessionId, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
}

async function waitFor(url, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return r; } catch {}
    await sleep(250);
  }
  throw new Error('timeout waiting for ' + url);
}

const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let cdp; let sessionId;
try {
  await waitFor(APP + '/');
  const browser = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=9224', '--user-data-dir=' + path.join(process.env.TEMP || '/tmp', 'ofc-profile'),
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });

  const version = await waitFor('http://127.0.0.1:9224/json/version');
  const { webSocketDebuggerUrl } = await version.json();
  cdp = await connect(webSocketDebuggerUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  ({ sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }));
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);

  const go = async (url) => {
    await cdp.send('Page.navigate', { url }, sessionId);
    for (let i = 0; i < 60; i++) {
      if (await evaluate(cdp, sessionId, `!!document.getElementById('root') && document.getElementById('root').childElementCount > 0`)) return;
      await sleep(250);
    }
    throw new Error('did not render ' + url);
  };

  const click = async (label) => {
    const hit = await evaluate(cdp, sessionId, `
      (() => {
        const wanted = ${JSON.stringify(label)};
        const el = [...document.querySelectorAll('button,a')].filter(n => n.getBoundingClientRect().width > 0)
          .find(n => (n.textContent || '').trim().includes(wanted) || (n.getAttribute('aria-label') || '').includes(wanted));
        if (!el) return false; el.click(); return true;
      })()`);
    if (!hit) throw new Error('button not found: ' + label);
    await sleep(500);
  };

  await go(APP + '/orders');
  await click('New order');
  await sleep(900);

  const form = await evaluate(cdp, sessionId, `(() => {
    const labels = [...document.querySelectorAll('label > span:first-child')].map(n => n.textContent.trim());
    return {
      labels,
      bodyHasDiscount: (document.body.innerText || '').includes('Discount'),
      bodyHasDelivery: (document.body.innerText || '').includes('Delivery fee'),
      bodyHasAmountPaid: (document.body.innerText || '').includes('Amount paid'),
    };
  })()`);

  check('Discount is gone from the order form', !form.labels.includes('Discount') && !form.bodyHasDiscount);
  check('Delivery fee is gone from the order form', !form.labels.includes('Delivery fee') && !form.bodyHasDelivery);
  check('Amount paid is gone from the order form', !form.labels.includes('Amount paid') && !form.bodyHasAmountPaid);
  check('Payment status survived', form.labels.includes('Payment status'));
  check('Payment method survived', form.labels.includes('Payment method'));
  check('Customer name survived', form.labels.includes('Customer name'));

  // Fill and save, to prove the form is still submittable without those fields.
  await evaluate(cdp, sessionId, `(() => {
    const setNative = (el, v) => {
      const proto = Object.getPrototypeOf(el);
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const label = [...document.querySelectorAll('label')].find(l => (l.textContent || '').includes('Customer name'));
    setNative(label.querySelector('input'), 'Form Check Bakery');
    const skip = [...document.querySelectorAll('button')].find(b => (b.textContent || '').trim() === 'Skip');
    if (skip) skip.click();
    return true;
  })()`);
  await sleep(400);
  await click('Save invoice');
  await sleep(1200);

  const saved = await evaluate(cdp, sessionId, `(() => {
    const stored = JSON.parse(localStorage.getItem(${JSON.stringify(STORE_KEY)}) || '{}');
    const match = (stored.orders || []).find(o => o.customerName === 'Form Check Bakery');
    return match ? { found: true, discount: match.discount, deliveryFee: match.deliveryFee, amountPaid: match.amountPaid } : { found: false };
  })()`);

  check('the new invoice was saved', saved.found);
  if (saved.found) {
    check('saved discount defaults to 0', saved.discount === 0, String(saved.discount));
    check('saved delivery fee defaults to 0', saved.deliveryFee === 0, String(saved.deliveryFee));
    check('saved amount paid defaults to 0', saved.amountPaid === 0, String(saved.amountPaid));
  }

  if (failures) { console.error(`\nFAIL — ${failures} check(s) failed`); process.exitCode = 1; }
  else console.log('\nPASS — order form is clear of unused fields and still saves');
} finally {
  cdp?.close();
  preview.kill();
}
