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
  // Select a recipe other than the first, so this fails if "Print current" is
  // quietly printing the default or the whole book.
  { name: 'recipe-single', route: '/recipes', pick: 2, open: ['Print current'], print: 'Print or save PDF', letter: true, expectOne: true },
  { name: 'reference-cards', route: '/recipes', open: ['Print cards'], print: 'Print or save PDF', letter: true },
  { name: 'kitchen-order-form', route: '/orders', open: ['Order form'], print: 'Print order form', letter: false },
  { name: 'invoice', route: `/orders?invoice=${ORDER_ID}`, open: [], print: 'Print or save PDF', letter: true },
  { name: 'baking-report', route: `/orders?invoice=${ORDER_ID}`, open: ['Baking report'], print: 'Print or save PDF', letter: false },
  { name: 'kitchen-order', route: `/orders?invoice=${ORDER_ID}`, open: ['Kitchen order'], print: 'Print for kitchen', letter: false },
  { name: 'shopping-list', route: '/inventory', open: ['Shopping List', 'All ingredients'], print: 'Print or save PDF', letter: true },
  { name: 'stock-check-sheet', route: '/inventory', open: ['Stock Check', 'All ingredients'], print: 'Print or save PDF', letter: false },
  { name: 'report-sales', route: '/reports', open: ['Print report'], print: 'Print / save PDF', letter: true },
  { name: 'report-production', route: '/reports', open: ['What to bake', 'Print report'], print: 'Print / save PDF', letter: true },
  { name: 'report-inventory', route: '/reports', open: ['Stock value', 'Print report'], print: 'Print / save PDF', letter: true },
  { name: 'report-customers', route: '/reports', open: ['Who buys', 'Print report'], print: 'Print / save PDF', letter: true },
  { name: 'report-financial', route: '/reports', open: ['Profit and loss', 'Print report'], print: 'Print / save PDF', letter: true },
  { name: 'sales-analytics', route: '/sales-analytics', open: ['Print report'], print: 'Print / save PDF', letter: true },
  { name: 'profit-margin', route: '/profit-margin', open: ['Print report'], print: 'Print / save PDF', letter: true },
  { name: 'financial-report', route: '/financial-reports', open: ['Print report'], print: 'Print / save PDF', letter: true },
  { name: 'purchase-order', route: '/purchase-orders', open: ['Print order'], print: 'Print / save PDF', letter: true },
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

/** Click the nth recipe tile in the "Choose a recipe" grid, returning its name. */
async function pickRecipe(cdp, sessionId, index) {
  return evaluate(cdp, sessionId, `
    (() => {
      const tiles = [...document.querySelectorAll('button')].filter((n) => /yield \\d+ · \\d+ ing/.test(n.textContent || ''));
      const tile = tiles[${index}];
      if (!tile) return null;
      const name = (tile.querySelector('p')?.textContent || '').trim();
      tile.click();
      return name;
    })()
  `);
}

/**
 * What the open preview actually contains. "Print current" is only correct if the
 * sheet holds the one selected recipe and not the whole book, so the count and the
 * heading are read back out of the live DOM rather than trusted from the click.
 */
async function readPortal(cdp, sessionId) {
  return evaluate(cdp, sessionId, `
    (() => {
      const portal = document.querySelector('.print-portal');
      if (!portal) return null;
      const pages = portal.querySelectorAll('.recipe-page');
      const heading = portal.querySelector('.report-title')?.textContent?.trim() || '';
      return {
        recipeCount: pages.length,
        heading,
        names: [...pages].map((p) => (p.querySelector('.report-product-header strong')?.textContent || '').trim()),
        headingText: (portal.querySelector('h2')?.textContent || '').trim(),
      };
    })()
  `);
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
  let picked = null;
  if (doc.pick !== undefined) {
    picked = await pickRecipe(cdp, sessionId, doc.pick);
    if (!picked) throw new Error('no recipe tile at index ' + doc.pick + ' for ' + doc.name);
    await sleep(400);
  }
  for (const label of doc.open) await click(cdp, sessionId, label);

  if (doc.expectOne) {
    const portal = await readPortal(cdp, sessionId);
    log(`   ${doc.name} preview:`, JSON.stringify(portal));
    if (!portal) throw new Error('print preview did not open for ' + doc.name);
    if (portal.recipeCount !== 1) throw new Error(`${doc.name}: expected 1 recipe, preview held ${portal.recipeCount}`);
    if (portal.names[0] !== picked) throw new Error(`${doc.name}: printed "${portal.names[0]}" but "${picked}" was selected`);
    if (portal.heading !== picked) throw new Error(`${doc.name}: heading said "${portal.heading}", expected "${picked}"`);
  }

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

async function persistSeedStore(cdp, sessionId) {
  // The app only writes to localStorage when something is edited, so flip the theme
  // and flip it back to make it save the complete seed store once. Writing a partial
  // object here instead would silently empty recipes and ingredients: loadStore()
  // falls back to [] for an absent key, not to the seed data.
  await goto(cdp, sessionId, APP.replace(/\/$/, '') + '/settings');
  await click(cdp, sessionId, 'After hours');
  await click(cdp, sessionId, 'Morning light');
  return evaluate(cdp, sessionId, `
    (() => {
      const stored = JSON.parse(localStorage.getItem(${JSON.stringify(STORE_KEY)}) || '{}');
      return { recipes: (stored.recipes || []).length, ingredients: (stored.ingredients || []).length };
    })()
  `);
}

async function seedOrder(cdp, sessionId) {
  // A fresh profile has never saved, so localStorage is empty — loadStore()
  // fills every missing field from the seed store anyway, and we only need to
  // supply the records themselves.
  return evaluate(cdp, sessionId, `
    (() => {
      const key = ${JSON.stringify(STORE_KEY)};
      let stored = {};
      try { stored = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
      let orders = stored.orders || [];
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
      // Expenses, stock movements and purchase orders are empty in the seed store,
      // so the financial, inventory and procurement reports would otherwise all
      // print as an honest but empty sheet.
      localStorage.setItem(key, JSON.stringify({
        ...stored,
        orders,
        expenses: [
          { id: 'exp-print-1', date: '2026-09-12', category: 'Rent', description: 'September rental', supplier: 'Matsapha Properties', amount: 4500 },
          { id: 'exp-print-2', date: '2026-09-18', category: 'Utilities', description: 'Electricity', supplier: 'EEC', amount: 780 },
          { id: 'exp-print-3', date: '2026-09-20', category: 'Transport', description: 'Delivery fuel', supplier: 'Total', amount: 320 },
          { id: 'exp-print-4', date: '2026-09-24', category: 'Packaging', description: 'Boxes and bags', supplier: 'Packhouse', amount: 265 },
        ],
        transactions: [
          { id: 'tx-print-1', ingredientId: 'flour', type: 'purchase', quantity: 25, unitCost: 12, date: '2026-09-15', note: '25 kg bag' },
          { id: 'tx-print-2', ingredientId: 'sugar', type: 'issue', quantity: 8, unitCost: 14, date: '2026-09-21', note: 'Wednesday bake' },
        ],
        purchaseOrders: [
          { id: 'po-print-1', ingredientId: 'flour', ingredientName: 'Bread Flour', supplier: 'Mills Ltd', quantity: 50, unit: 'kg', estimatedCost: 600, status: 'pending', orderDate: '2026-09-22', notes: 'Auto-generated' },
          { id: 'po-print-2', ingredientId: 'butter', ingredientName: 'Sunshine Margarine', supplier: 'Supermarket', quantity: 8, unit: 'kg', estimatedCost: 168, status: 'ordered', orderDate: '2026-09-23', notes: '' },
        ],
      }));
      return { orders: orders.length, expenses: 4, purchaseOrders: 2 };
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
    const persisted = await persistSeedStore(cdp, sessionId);
    const seeded = await seedOrder(cdp, sessionId);
    log('3. seeded', JSON.stringify({ ...persisted, ...seeded }));

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
