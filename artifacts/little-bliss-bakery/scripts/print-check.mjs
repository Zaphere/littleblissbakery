/* Print sweep: opens every print document in headless Chrome, drives the real
   print button, and captures it with CDP Page.printToPDF at A4 (from the app's
   own @page rule) and at Letter. Output lands in the OS temp dir so nothing
   binary is left in the repo. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4402;
const APP = `http://localhost:${PORT}/`;
const STORE_KEY = 'little-bliss-store-v1';
const ORDER_ID = 'order-print-check';
const INVOICE = 'LBB 00042';
const OUT_DIR = path.join(os.tmpdir(), 'little-bliss-print-check');

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

const A4 = { paperWidth: 8.27, paperHeight: 11.69 };
const LETTER = { paperWidth: 8.5, paperHeight: 11 };
const MM = (n) => n / 25.4;

// name, route to open, buttons to click in order, the final print button label
const DOCUMENTS = [
  { name: 'recipe-book', route: '/recipes', open: ['Print all'], print: 'Print or save PDF', letter: true },
  { name: 'reference-cards', route: '/recipes', open: ['Print cards'], print: 'Print or save PDF', letter: true },
  { name: 'kitchen-order-form', route: '/orders', open: ['Order form'], print: 'Print order form', letter: false },
  { name: 'invoice', route: `/orders?invoice=${ORDER_ID}`, open: [], print: 'Print or save PDF', letter: true },
  { name: 'baking-report', route: `/orders?invoice=${ORDER_ID}`, open: ['Baking report'], print: 'Print or save PDF', letter: false },
  { name: 'kitchen-order', route: `/orders?invoice=${ORDER_ID}`, open: ['Kitchen order'], print: 'Print for kitchen', letter: false },
  { name: 'shopping-list', route: '/inventory', open: ['Shopping List', 'All ingredients'], print: 'Print or save PDF', letter: true },
  { name: 'stock-check-sheet', route: '/inventory', open: ['Stock Check', 'All ingredients'], print: 'Print or save PDF', letter: false },
];

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    let nextId = 0;
    socket.onopen = () =>
      resolve({
        send(method, params = {}, sessionId) {
          return new Promise((res, rej) => {
            const id = ++nextId;
            pending.set(id, { res, rej });
            socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
          });
        },
        close() {
          try { socket.close(); } catch {}
        },
      });
    socket.onerror = (error) => reject(new Error('WebSocket error: ' + error.message));
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { res, rej } = pending.get(message.id);
        pending.delete(message.id);
        message.error ? rej(new Error(message.method + ': ' + message.error.message)) : res(message.result);
      }
    };
  });
}

async function evaluate(cdp, sessionId, expression, timeoutMs = 15000) {
  const call = cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  const timer = new Promise((_, rej) => setTimeout(() => rej(new Error('evaluate timed out: ' + expression.slice(0, 90))), timeoutMs));
  const r = await Promise.race([call, timer]);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
}

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return r; } catch {}
    await sleep(250);
  }
  throw new Error('timeout waiting for ' + url);
}

async function goto(cdp, sessionId, url) {
  const target = url.includes('?') ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;
  await cdp.send('Page.navigate', { url: target }, sessionId);
  for (let i = 0; i < 60; i++) {
    const ready = await evaluate(cdp, sessionId, `!!document.getElementById('root') && document.getElementById('root').childElementCount > 0`);
    if (ready) return;
    await sleep(250);
  }
  throw new Error('did not render: ' + url);
}

async function click(cdp, sessionId, label) {
  const found = await evaluate(cdp, sessionId, `
    (() => {
      const wanted = ${JSON.stringify(label)};
      const nodes = [...document.querySelectorAll('button,[role="button"],a')]
        .filter((n) => n.getBoundingClientRect().width > 0);
      const el = nodes.find((n) =>
        (n.textContent || '').trim().includes(wanted) ||
        (n.getAttribute('aria-label') || '').includes(wanted)
      );
      if (!el) return false;
      el.click();
      return true;
    })()
  `);
  if (!found) throw new Error('button not found: ' + label);
  await sleep(450);
}

function mediaBox(buffer) {
  const match = buffer.toString('latin1').match(/\/MediaBox\s*\[([^\]]+)\]/);
  if (!match) return '?';
  const parts = match[1].trim().split(/\s+/).map(Number);
  return (parts[2] > parts[3] ? 'landscape' : 'portrait') + ' ' + parts[2] + 'x' + parts[3];
}

function pageCount(buffer) {
  const text = buffer.toString('latin1');
  const pages = text.match(/\/Type\s*\/Page(?![sA-Za-z])/g);
  return pages ? pages.length : (text.match(/\/Contents/g) || []).length;
}

async function printDocument(cdp, sessionId, doc, paper) {
  // Headless Chrome never opens a dialog, but window.print() would fire
  // afterprint synchronously and tear the print styles down before we can
  // capture. Swallow it; the class/style are cleaned up below.
  await evaluate(cdp, sessionId, `(() => { window.print = () => true; return true; })()`);
  for (const label of doc.open) await click(cdp, sessionId, label);
  await click(cdp, sessionId, doc.print);

  const armed = await evaluate(cdp, sessionId, `document.body.classList.contains('printing-doc')`);
  if (!armed) throw new Error('printing-doc was not applied for ' + doc.name);

  const letter = paper === 'letter';
  const params = {
    printBackground: true,
    preferCSSPageSize: !letter,
    paperWidth: letter ? LETTER.paperWidth : A4.paperWidth,
    paperHeight: letter ? LETTER.paperHeight : A4.paperHeight,
    marginTop: MM(10), marginBottom: MM(10), marginLeft: MM(10), marginRight: MM(10),
  };
  const result = await cdp.send('Page.printToPDF', params, sessionId);
  const file = path.join(OUT_DIR, `${doc.name}--${paper}.pdf`);
  writeFileSync(file, Buffer.from(result.data, 'base64'));

  await evaluate(cdp, sessionId, `
    (() => {
      document.body.classList.remove('printing-doc');
      const rule = document.getElementById('lb-print-page');
      if (rule) rule.remove();
      return true;
    })()
  `);
  await sleep(250);
  const bytes = Buffer.from(result.data, 'base64');
  return { file, pages: pageCount(bytes), box: mediaBox(bytes) };
}

async function seedOrder(cdp, sessionId) {
  // A fresh profile has never saved, so localStorage is empty — loadStore()
  // fills every missing field from the seed store anyway, and we only need to
  // supply the order itself.
  return evaluate(cdp, sessionId, `
    (() => {
      const key = ${JSON.stringify(STORE_KEY)};
      let orders = [];
      try { orders = JSON.parse(localStorage.getItem(key) || '{}').orders || []; } catch {}
      orders = orders.filter((o) => o.id !== ${JSON.stringify(ORDER_ID)});
      orders.push({
        id: ${JSON.stringify(ORDER_ID)},
        invoiceNumber: ${JSON.stringify(INVOICE)},
        orderNumber: ${JSON.stringify(INVOICE)},
        customerName: 'Thandeka Mabuza',
        customerAddress: '12 Somhlolo Road',
        customerCity: 'Matsapha',
        phone: '+268 7612 3456',
        orderDate: '2026-09-22',
        dueDate: '2026-09-25',
        salesRep: 'Front desk',
        code: 'CLI-014',
        fob: 'Matsapha',
        taxRate: 0,
        items: [
          { productId: 'oat-raisin', quantity: 2, unitPrice: 180, costSnapshot: 0 },
          { productId: 'choc-chip', quantity: 1, unitPrice: 180, costSnapshot: 0 },
        ],
        discount: 10,
        deliveryFee: 25,
        paymentStatus: 'Paid',
        paymentMethod: 'Cash',
        amountPaid: 250,
        payments: [{ date: '2026-09-22', amount: 250 }],
        notes: 'Ring the bell — side gate.',
        createdAt: '2026-09-22T08:15:00.000Z',
        priority: 'Normal',
      });
      localStorage.setItem(key, JSON.stringify({ orders }));
      return { orders: orders.length };
    })()
  `);
}

async function main() {
  let preview; let chrome; let cdp;
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  try {
    preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
    });
    preview.stdout.on('data', (b) => process.stdout.write('   [preview] ' + b));
    preview.stderr.on('data', (b) => process.stderr.write('   [preview] ' + b));
    await waitFor(APP + 'index.html');
    const html = await (await fetch(APP)).text();
    if (!html.includes('Little Bliss')) throw new Error('wrong app served on :' + PORT);
    log('1. preview server up on :' + PORT);

    const profile = path.join(os.tmpdir(), 'lb-print-check-profile-' + Date.now());
    chrome = spawn(CHROME, [
      '--headless=new', '--remote-debugging-port=9223', '--user-data-dir=' + profile,
      '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
    ], { stdio: 'ignore' });

    const version = await waitFor('http://127.0.0.1:9223/json/version');
    const { webSocketDebuggerUrl } = await version.json();
    cdp = await connect(webSocketDebuggerUrl);
    log('2. chrome attached');

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);

    await goto(cdp, sessionId, APP);
    const seeded = await seedOrder(cdp, sessionId);
    log('3. seeded', JSON.stringify(seeded));

    const rows = [];
    for (const doc of DOCUMENTS) {
      await goto(cdp, sessionId, APP.replace(/\/$/, '') + doc.route);
      try {
        const portrait = await printDocument(cdp, sessionId, doc, 'a4');
        rows.push({ doc: doc.name, paper: 'A4', pages: portrait.pages, box: portrait.box, file: portrait.file });
        log(`   ${doc.name} A4 → ${portrait.pages} page(s) [${portrait.box}]`);
        if (doc.letter) {
          const letter = await printDocument(cdp, sessionId, doc, 'letter');
          rows.push({ doc: doc.name, paper: 'Letter', pages: letter.pages, box: letter.box, file: letter.file });
          log(`   ${doc.name} Letter → ${letter.pages} page(s) [${letter.box}]`);
        }
      } catch (error) {
        rows.push({ doc: doc.name, paper: '-', pages: 0, error: error.message });
        log(`   ${doc.name} FAILED: ${error.message}`);
      }
    }

    log('\n' + rows.map((r) => `${(r.doc + ' ' + r.paper).padEnd(30)} ${r.error ? 'ERROR ' + r.error : r.pages + ' page(s)'}`).join('\n'));
    if (rows.some((r) => r.error)) throw new Error('some documents failed to print');
    log('\nPDFs in ' + OUT_DIR);
  } finally {
    try { cdp?.close(); } catch {}
    try { preview?.kill('SIGKILL'); } catch {}
    try { chrome?.kill('SIGKILL'); } catch {}
  }
}

main().catch((error) => {
  log('FAIL —', error.message);
  process.exit(1);
});
