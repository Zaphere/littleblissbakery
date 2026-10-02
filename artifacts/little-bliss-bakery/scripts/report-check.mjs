/* Renders each report document under print media and captures a screenshot, plus
   asserts the printed text has no rendering faults. Output PNGs go to the OS temp
   dir; nothing binary lands in the repo. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4422;
const APP = `http://localhost:${PORT}/`;
const OUT = path.join(os.tmpdir(), 'little-bliss-report-shots');
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome'].find(p => existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = console.log;

const CASES = [
  { name: 'report-sales', route: '/reports', open: ['Print report'] },
  { name: 'report-production', route: '/reports', open: ['What to bake', 'Print report'] },
  { name: 'report-inventory', route: '/reports', open: ['Stock value', 'Print report'] },
  { name: 'report-customers', route: '/reports', open: ['Who buys', 'Print report'] },
  { name: 'report-financial', route: '/reports', open: ['Profit and loss', 'Print report'] },
  { name: 'sales-analytics', route: '/sales-analytics', open: ['Print report'] },
  { name: 'profit-margin', route: '/profit-margin', open: ['Print report'] },
  { name: 'financial-report', route: '/financial-reports', open: ['Print report'] },
  { name: 'purchase-order', route: '/purchase-orders', open: ['Print order'] },
];

/* Every route the sidebar and router offer. Used by --smoke to prove the
   reporting work left the rest of the app rendering. */
const ROUTES = [
  '/', '/ingredients', '/recipes', '/orders', '/expenses', '/inventory', '/reports', '/budget',
  '/clients', '/customer-analytics', '/sales-analytics', '/production-calendar', '/purchase-orders',
  '/profit-margin', '/financial-reports', '/expiration-tracking', '/delivery-routes',
  '/whatsapp-integration', '/staff-tasks', '/backup-restore', '/settings', '/audit', '/more',
];

const SMOKE = process.argv.includes('--smoke');

/* Anything here would mean a broken figure reached the page. */
const FAULTS = ['NaN', 'undefined', 'Infinity', '[object Object]', 'E-NaN', 'null%', '—%'];

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    const listeners = [];
    let nextId = 0;
    socket.onopen = () => resolve({
      send(method, params = {}, sessionId) {
        return new Promise((res, rej) => {
          const id = ++nextId;
          pending.set(id, { res, rej });
          socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
        });
      },
      on(method, handler) { listeners.push({ method, handler }); },
      close() { try { socket.close(); } catch {} },
    });
    socket.onerror = e => reject(new Error('ws ' + e.message));
    socket.onmessage = event => {
      const m = JSON.parse(event.data);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? rej(new Error(m.method + ': ' + m.error.message)) : res(m.result);
        return;
      }
      listeners.filter(entry => entry.method === m.method).forEach(entry => entry.handler(m.params));
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
  throw new Error('timeout ' + url);
}

async function goto(cdp, sessionId, url) {
  await cdp.send('Page.navigate', { url: url + (url.includes('?') ? '&' : '?') + '_=' + Date.now() }, sessionId);
  for (let i = 0; i < 60; i++) {
    if (await evaluate(cdp, sessionId, `!!document.getElementById('root') && document.getElementById('root').childElementCount > 0`)) return;
    await sleep(250);
  }
  throw new Error('did not render ' + url);
}

async function click(cdp, sessionId, label) {
  const ok = await evaluate(cdp, sessionId, `(() => {
    const wanted = ${JSON.stringify(label)};
    const el = [...document.querySelectorAll('button,[role="button"],a')]
      .filter(n => n.getBoundingClientRect().width > 0)
      .find(n => (n.textContent || '').trim().includes(wanted) || (n.getAttribute('aria-label') || '').includes(wanted));
    if (!el) return false; el.click(); return true;
  })()`);
  if (!ok) throw new Error('button not found: ' + label);
  await sleep(500);
}

const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
let chrome, cdp;
const failures = [];
const pageErrors = [];
try {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  await waitFor(APP + 'index.html');
  const profile = path.join(os.tmpdir(), 'lb-shots-' + Date.now());
  chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9227', '--user-data-dir=' + profile, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  const { webSocketDebuggerUrl } = await (await waitFor('http://127.0.0.1:9227/json/version')).json();
  cdp = await connect(webSocketDebuggerUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Log.enable', {}, sessionId);
  /* A page that throws mid-render leaves an empty #root, which otherwise just
     looks like a slow load. Surface the real exception instead. */
  cdp.on('Runtime.exceptionThrown', event => {
    const d = event.params.exceptionDetails;
    pageErrors.push((d.exception?.description || d.text || '').split('\n')[0]);
  });
  cdp.on('Log.entryAdded', event => {
    if (event.params.entry.level === 'error') pageErrors.push(`[${event.params.entry.source}] ${event.params.entry.text}`);
  });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId);

  await goto(cdp, sessionId, APP);
  // Persist the full seed store, then add records so every report has content.
  await goto(cdp, sessionId, APP.replace(/\/$/, '') + '/settings');
  await click(cdp, sessionId, 'After hours');
  await click(cdp, sessionId, 'Morning light');
  await evaluate(cdp, sessionId, `(() => {
    const key='little-bliss-store-v1'; const s=JSON.parse(localStorage.getItem(key)||'{}');
    const mk=(id,inv,name,date,due,items,disc,paid,status)=>({id,invoiceNumber:inv,orderNumber:inv,customerName:name,customerCity:'Matsapha',phone:'+268 7612 3456',orderDate:date,dueDate:due,taxRate:0,items,discount:disc,deliveryFee:25,paymentStatus:status,amountPaid:paid,createdAt:date+'T08:15:00.000Z'});
    const orders=(s.orders||[]).filter(o=>!String(o.id).startsWith('seed-')).concat([
      mk('seed-1','LBB 00040','Thandeka Mabuza','2026-09-03','2026-09-05',[{productId:'oat-raisin',quantity:4,unitPrice:180,costSnapshot:0},{productId:'choc-chip',quantity:2,unitPrice:180,costSnapshot:0}],0,760,'Paid'),
      mk('seed-2','LBB 00041','Nomvula Dlamini','2026-09-12','2026-09-14',[{productId:'dark-choc-chip',quantity:6,unitPrice:190,costSnapshot:0}],20,0,'Unpaid'),
      mk('seed-3','LBB 00042','Sipho Nkosi','2026-09-22','2026-09-25',[{productId:'oat-raisin',quantity:3,unitPrice:180,costSnapshot:0},{productId:'dark-choc-chip',quantity:2,unitPrice:190,costSnapshot:0}],10,0,'Part paid'),
      mk('seed-4','LBB 00043','Lindiwe Khumalo','2026-09-28','2026-09-30',[{productId:'choc-chip',quantity:5,unitPrice:180,costSnapshot:0}],0,900,'Paid'),
    ]);
    localStorage.setItem(key, JSON.stringify({...s, orders,
      expenses:[
        {id:'e1',date:'2026-09-02',category:'Rent',description:'September rental',supplier:'Matsapha Properties',amount:4500},
        {id:'e2',date:'2026-09-09',category:'Utilities',description:'Electricity and water',supplier:'EEC',amount:780},
        {id:'e3',date:'2026-09-15',category:'Transport',description:'Delivery fuel',supplier:'Total',amount:320},
        {id:'e4',date:'2026-09-19',category:'Packaging',description:'Boxes and bags',supplier:'Packhouse',amount:265},
        {id:'e5',date:'2026-09-26',category:'Rent',description:'Oven servicing',supplier:'Bakers Choice',amount:540},
      ],
      transactions:[
        {id:'t1',ingredientId:'flour',type:'purchase',quantity:25,unitCost:12,date:'2026-09-05',note:'25 kg bag'},
        {id:'t2',ingredientId:'sugar',type:'issue',quantity:8,unitCost:14,date:'2026-09-21',note:'Wednesday bake'},
      ],
      purchaseOrders:[
        {id:'po1',ingredientId:'flour',ingredientName:'Bread Flour',supplier:'Mills Ltd',quantity:50,unit:'kg',estimatedCost:600,status:'pending',orderDate:'2026-09-22',notes:'Auto-generated'},
        {id:'po2',ingredientId:'margarine',ingredientName:'Sunshine Margarine',supplier:'Shoprite',quantity:8,unit:'kg',estimatedCost:168,status:'ordered',orderDate:'2026-09-23',notes:''},
      ],
    }));
    return true;
  })()`);

  if (SMOKE) {
    for (const route of ROUTES) {
      const errorsBefore = pageErrors.length;
      let rendered = false;
      try {
        await goto(cdp, sessionId, APP.replace(/\/$/, '') + route);
        const seen = await evaluate(cdp, sessionId, `(() => {
          const root = document.getElementById('root');
          const text = (root && root.innerText) || '';
          return { chars: text.trim().length, heading: (document.querySelector('h1,h2') || {}).textContent || '' };
        })()`);
        rendered = seen.chars > 0;
        if (!rendered) failures.push(`${route}: rendered an empty page`);
        else if (seen.chars < 120) failures.push(`${route}: suspiciously little content (${seen.chars} chars)`);
        if (pageErrors.length > errorsBefore) failures.push(`${route}: ${pageErrors[errorsBefore]}`);
        log(`${route.padEnd(24)} ${String(seen.chars).padStart(6)} chars  ${seen.heading.slice(0, 34)}${pageErrors.length > errorsBefore ? '  PAGE ERROR: ' + pageErrors[errorsBefore] : ''}`);
      } catch (error) {
        failures.push(`${route}: ${error.message}`);
        log(`${route.padEnd(24)} FAILED ${error.message}`);
      }
    }
  } else for (const testCase of CASES) {
    const errorsBefore = pageErrors.length;
    await goto(cdp, sessionId, APP.replace(/\/$/, '') + testCase.route);

    /* The screen KPI cards carry a qualifier ("This month", "of 12 recipes").
       A card that renders it in both footer slots shows it twice, so compare
       the two slots and flag them when they match. */
    const kpiAudit = await evaluate(cdp, sessionId, `(() => {
      const grid = document.querySelector('.grid.gap-4');
      if (!grid) return { cards: 0, dupes: [] };
      const dupes = [];
      [...grid.children].forEach(card => {
        const slots = [...card.querySelectorAll('.mt-4 span')].map(n => (n.textContent || '').trim()).filter(Boolean);
        if (slots.length === 2 && slots[0] === slots[1]) dupes.push((card.textContent || '').slice(0, 40));
      });
      return { cards: grid.children.length, dupes };
    })()`);
    if (kpiAudit.dupes.length) failures.push(`${testCase.name}: ${kpiAudit.dupes.length} KPI card(s) repeat their qualifier — ${kpiAudit.dupes[0]}`);

    for (const label of testCase.open) await click(cdp, sessionId, label);

    const audit = await evaluate(cdp, sessionId, `(() => {
      const paper = document.querySelector('.report-doc-paper');
      if (!paper) return { missing: true };
      const text = paper.innerText;
      const faults = ${JSON.stringify(FAULTS)}.filter(f => text.includes(f));
      return {
        missing: false,
        title: (paper.querySelector('.report-doc-title')||{}).textContent || '',
        period: (paper.querySelector('.report-doc-meta strong')||{}).textContent || '',
        kpis: [...paper.querySelectorAll('.report-doc-kpi strong')].map(n => n.textContent),
        tables: paper.querySelectorAll('.report-doc-table').length,
        rows: paper.querySelectorAll('.report-doc-table tbody tr').length,
        totals: [...paper.querySelectorAll('.report-doc-table tfoot tr')].map(r => [...r.children].map(c => c.textContent).join(' | ')),
        charts: paper.querySelectorAll('.report-doc-chart svg').length,
        bars: paper.querySelectorAll('.report-doc-chart rect').length,
        paths: paper.querySelectorAll('.report-doc-chart path').length,
        notes: [...paper.querySelectorAll('.report-doc-notes li')].map(n => n.textContent),
        empty: !!paper.querySelector('.report-doc-empty'),
        faults,
        text: text.slice(0, 900),
      };
    })()`);

    if (audit.missing) { failures.push(`${testCase.name}: no .report-doc-paper rendered`); log(`${testCase.name.padEnd(20)} MISSING PAPER`); continue; }
    if (audit.faults.length) failures.push(`${testCase.name}: rendered text contains ${audit.faults.join(', ')}`);

    await evaluate(cdp, sessionId, `(() => { window.print = () => true; return true; })()`);
    await click(cdp, sessionId, 'Print / save PDF');
    const armed = await evaluate(cdp, sessionId, `document.body.classList.contains('printing-doc')`);
    if (!armed) { failures.push(`${testCase.name}: print pipeline not armed`); continue; }
    await cdp.send('Emulation.setEmulatedMedia', { media: 'print' }, sessionId);
    await sleep(400);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
    writeFileSync(path.join(OUT, testCase.name + '.png'), Buffer.from(shot.data, 'base64'));
    await cdp.send('Emulation.setEmulatedMedia', { media: '' }, sessionId);

    log(`${testCase.name.padEnd(20)} "${audit.title}" period=${audit.period} kpis=${audit.kpis.length} tables=${audit.tables} rows=${audit.rows} charts=${audit.charts} bars=${audit.bars} paths=${audit.paths} notes=${audit.notes.length}${audit.faults.length ? ' FAULTS:' + audit.faults.join(',') : ''}`);
    log(`${''.padEnd(20)} figures: ${audit.kpis.join(' / ')} | screen KPIs: ${kpiAudit.cards} cards, ${kpiAudit.dupes.length} duplicated`);
    const caseErrors = pageErrors.slice(errorsBefore);
    if (caseErrors.length) { failures.push(`${testCase.name}: page error — ${caseErrors[0]}`); log(`${''.padEnd(20)} PAGE ERROR: ${caseErrors[0]}`); }
  }

  log('\nPNG screenshots in ' + OUT);
  if (failures.length) { log('\nFAILURES:\n - ' + failures.join('\n - ')); process.exitCode = 1; }
  else log(SMOKE
    ? `\nPASS — all ${ROUTES.length} routes rendered with no page errors`
    : `\nPASS — every report document rendered, printed and free of rendering faults`);
} catch (error) {
  log('ERROR', error.message);
  process.exitCode = 1;
} finally {
  try { cdp?.close(); } catch {}
  try { preview.kill('SIGKILL'); } catch {}
  try { chrome?.kill('SIGKILL'); } catch {}
}