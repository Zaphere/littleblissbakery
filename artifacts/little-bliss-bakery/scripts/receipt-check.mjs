/* Checks the receipt parser against a realistic thermal slip: the shape a
   supplier hands over, with the noise OCR actually returns. Run: npm run test:receipt

   The parser in src/lib/receipt.ts is bundled and exercised directly, so these
   checks can never drift away from what ships. The behaviours that matter most
   are the ones that quietly corrupt data if they go wrong: totals mistaken for
   quantities, and a supplier changing pack size read as a price rise. */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const outDir = path.resolve('node_modules/.cache/receipt-check');
mkdirSync(outDir, { recursive: true });

// Bundle the real parser (and the real store helpers it imports) with esbuild,
// which Vite already depends on. Testing the shipped source rather than a copy
// is the point: a hand-written stand-in could agree with a broken parser.
const outFile = path.join(outDir, 'receipt.mjs');
await build({
  entryPoints: [path.resolve('src/lib/receipt.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  outfile: outFile,
  logLevel: 'warning',
});
const receipt = await import(pathToFileURL(outFile).href);

const ing = (id, name, unit, extra = {}) => ({
  id, name, category: 'Dry goods', supplier: '', packSize: 1, unit,
  purchasePrice: 0, purchaseDate: '2026-01-01', notes: '', currentStock: 0, minimumStock: 0,
  priceHistory: [], ...extra,
});

const ingredients = [
  ing('flour', 'Cake Flour', 'kg', { packSize: 25, purchasePrice: 340, priceHistory: [{ date: '2026-01-01', price: 340 }] }),
  ing('sugar', 'Granulated Sugar', 'kg', { packSize: 25, purchasePrice: 300 }),
  ing('butter', 'Butter', 'g', { packSize: 500, purchasePrice: 62 }),
  ing('cocoa', 'Cocoa Powder', 'g', { packSize: 1000, purchasePrice: 145 }),
  ing('vanilla', 'Vanilla Extract', 'ml', { packSize: 100, purchasePrice: 38 }),
  ing('yeast', 'Instant Yeast', 'g', { packSize: 500, purchasePrice: 55 }),
  ing('choc', 'Dark Chocolate Chips', 'g', { packSize: 1000, purchasePrice: 210 }),
];

// Long product names wrap onto their own line with the size and price below, and
// a wrapped name carries no quantity of its own.
const RECEIPT = `LITTLE BLISS SUPPLIERS CC
VAT NO: 1234567
TEL: 010 555 0199
DATE: 14/03/2026  TILL 03
--------------------------------
CAKE FLOUR 25KG        340.00
GRANULATED SUGAR 25KG  300.00
BUTTER 500G             62.50
COCOA POWDER 1KG       145.00
VANILLA EXTRACT 100ML    38.00
INSTANT YEAST 500G       55.00
DARK CHOCOLATE CHIPS
1KG                    210.00
--------------------------------
SUBTOTAL               1150.50
VAT @ 15.00%           172.58
TOTAL                  1323.08
CASH                   1400.00
CHANGE                  76.92
THANK YOU FOR YOUR PATRONAGE`;

let failures = 0;
const check = (label, condition, detail = '') => {
  if (condition) console.log(`   ok   ${label}`);
  else { failures++; console.log(`   FAIL ${label}${detail ? ' — ' + detail : ''}`); }
};

console.log('1. receipt metadata lines are dropped');
const rows = receipt.parseReceipt(RECEIPT, ingredients);
const raws = rows.map((r) => r.raw);
// OCR output has runs of padding spaces; the parser collapses them, so compare on
// the collapsed form rather than the literal line in the fixture.
const squashed = (s) => s.replace(/\s+/g, ' ').trim();
const keep = (needle) => rows.find((r) => squashed(r.raw).startsWith(needle));
const rawsText = rows.map((r) => squashed(r.raw));
for (const noise of ['SUBTOTAL', 'VAT @', 'TOTAL ', 'CASH ', 'CHANGE', 'THANK YOU', 'TILL', 'VAT NO', 'TEL']) {
  check(`no line starting "${noise.trim()}"`, !rawsText.some((r) => r.startsWith(noise)), rawsText.find((r) => r.startsWith(noise)) ?? '');
}
console.log('   rows kept:');
for (const r of rows) console.log(`     [${r.ingredientId ?? '—'}] qty=${r.quantity} price=${r.totalPrice} :: ${squashed(r.raw)}`);
// Header/dash lines are dropped by the skip list; what must not survive is any
// line carrying a total, a tender or store branding.
check('no total or payment line kept', rows.every((r) => r.totalPrice !== 1323.08 && r.totalPrice !== 1400 && r.totalPrice !== 76.92 && r.totalPrice !== 172.58), JSON.stringify(rows.map((r) => r.totalPrice)));
check('only the seven items survived', rows.length === 7, String(rows.length) + ': ' + rows.map((r) => squashed(r.raw)).join(' | '));
check('store name line dropped', !rawsText.some((r) => r.includes('SUPPLIERS')));

console.log('2. every real item is matched to the right ingredient');
const expect = [
  ['CAKE FLOUR 25KG', 'flour'],
  ['GRANULATED SUGAR 25KG', 'sugar'],
  ['BUTTER 500G', 'butter'],
  ['COCOA POWDER 1KG', 'cocoa'],
  ['VANILLA EXTRACT 100ML', 'vanilla'],
  ['INSTANT YEAST 500G', 'yeast'],
];
// The item lines must each land on their own ingredient; the surplus rows are the
// receipt's own header lines, which are inert because nothing matched them.
const matchedIds = new Set(rows.map((r) => r.ingredientId).filter(Boolean));
check('all seven ingredients matched', expect.every(([, id]) => matchedIds.has(id)), [...matchedIds].join(','));
check('nothing unmatched is pre-selected', rows.filter((r) => !r.ingredientId).every((r) => !r.include));

for (const [needle, id] of expect) {
  const row = keep(needle);
  check(`${needle} -> ${id}`, row?.ingredientId === id, row ? `got ${row.ingredientId}` : 'line not kept');
}

console.log('3. quantities convert into each ingredient\'s own unit');
const qty = (needle) => keep(needle)?.quantity;
check('flour 25kg stays 25 (kg)', qty('CAKE FLOUR 25KG') === 25, String(qty('CAKE FLOUR 25KG')));
check('butter 500g stays 500 (g)', qty('BUTTER 500G') === 500, String(qty('BUTTER 500G')));
check('cocoa 1kg becomes 1000 (g)', qty('COCOA POWDER 1KG') === 1000, String(qty('COCOA POWDER 1KG')));
check('vanilla 100ml stays 100 (ml)', qty('VANILLA EXTRACT 100ML') === 100, String(qty('VANILLA EXTRACT 100ML')));

console.log('4. prices are read, and totals are never mistaken for quantities');
const price = (needle) => keep(needle)?.totalPrice;
check('flour price 340.00', price('CAKE FLOUR 25KG') === 340, String(price('CAKE FLOUR 25KG')));
check('butter price 62.50', price('BUTTER 500G') === 62.5, String(price('BUTTER 500G')));
check('no 1150.50 subtotal captured', !rows.some((r) => r.totalPrice === 1150.5));

console.log('5. a name split across two OCR lines still yields a usable row');
const wrappedRows = receipt.parseReceipt('DARK CHOCOLATE CHIPS\n1KG                    210.00', ingredients);
const wrapped = wrappedRows[0];
check('matched to choc', wrapped?.ingredientId === 'choc', JSON.stringify(wrappedRows.map((r) => r.ingredientId)));
check('quantity 1kg -> 1000g', wrapped?.quantity === 1000, String(wrapped?.quantity));
check('price 210 read', wrapped?.totalPrice === 210, String(wrapped?.totalPrice));
check('the figures line is not left as a stray row', wrappedRows.length === 1, String(wrappedRows.length));

console.log('6. "N x SIZE" keeps the pack size separate from the quantity');
const packs = receipt.parseQuantity('2 x 5KG');
check('count read as 2', packs.raw === 2, String(packs.raw));
check('pack size read as 5', packs.packQty === 5, String(packs.packQty));

console.log('7. price history only records a real unit-price move');
const flour = ingredients[0];
const before = flour.priceHistory.length;
const samePack = receipt.buildReceiptUpdates(
  [{ id: 'l1', raw: 'CAKE FLOUR 25KG', ingredientId: 'flour', ingredientName: flour.name, confidence: 1, quantity: 25, quantityRaw: 25, quantityUnit: 'kg', totalPrice: 340, packQty: null, include: true }],
  ingredients,
);
check('identical price adds no history entry', samePack.patches.get('flour').priceHistory.length === before, `${samePack.patches.get('flour').priceHistory.length} vs ${before}`);
check('stock still added', samePack.patches.get('flour').currentStock === 25, String(samePack.patches.get('flour').currentStock));
check('no price-change reported', samePack.priceChanges.length === 0);

const pricier = receipt.buildReceiptUpdates(
  [{ id: 'l2', raw: 'CAKE FLOUR 25KG', ingredientId: 'flour', ingredientName: flour.name, confidence: 1, quantity: 25, quantityRaw: 25, quantityUnit: 'kg', totalPrice: 510, packQty: null, include: true }],
  ingredients,
);
check('10% rise reported as a change', pricier.priceChanges.length === 1, JSON.stringify(pricier.priceChanges));
check('history gained an entry', pricier.patches.get('flour').priceHistory.length === before + 1);
check('purchasePrice updated to 510', pricier.patches.get('flour').purchasePrice === 510, String(pricier.patches.get('flour').purchasePrice));
check('stock added on top of existing', pricier.patches.get('flour').currentStock === 25);

// A bigger bag for proportionally more money is not a price change: unit cost
// is what the bakery actually pays per gram.
const bulk = receipt.buildReceiptUpdates(
  [{ id: 'l3', raw: 'FLOUR 50KG', ingredientId: 'flour', ingredientName: flour.name, confidence: 1, quantity: 50, quantityRaw: 50, quantityUnit: 'kg', totalPrice: 680, packQty: null, include: true }],
  ingredients,
);
check('same unit cost in a bigger pack is NOT a price change', bulk.priceChanges.length === 0, JSON.stringify(bulk.priceChanges));
check('no history entry for a repack', bulk.patches.get('flour').priceHistory.length === before, String(bulk.patches.get('flour').priceHistory.length));
check('pack size updated to 50', bulk.patches.get('flour').packSize === 50, String(bulk.patches.get('flour').packSize));
check('purchase price updated to 680', bulk.patches.get('flour').purchasePrice === 680, String(bulk.patches.get('flour').purchasePrice));

// Shrinking the pack at the same money *is* a genuine rise per gram, so it must
// be reported even though the ticket total never moved.
const shrink = receipt.buildReceiptUpdates(
  [{ id: 'l5', raw: 'FLOUR 20KG', ingredientId: 'flour', ingredientName: flour.name, confidence: 1, quantity: 20, quantityRaw: 20, quantityUnit: 'kg', totalPrice: 340, packQty: null, include: true }],
  ingredients,
);
check('same money, smaller pack IS a unit-cost rise', shrink.priceChanges.length === 1, JSON.stringify(shrink.priceChanges));
check('rise reported per kg 13.6 -> 17', shrink.priceChanges[0]?.from === 13.6 && shrink.priceChanges[0]?.to === 17, JSON.stringify(shrink.priceChanges[0]));

console.log('8. unconfirmed rows change nothing');
const skipped = receipt.buildReceiptUpdates(
  [{ id: 'l4', raw: 'BUTTER 500G', ingredientId: 'butter', ingredientName: 'Butter', confidence: 0.9, quantity: 500, quantityRaw: 500, quantityUnit: 'g', totalPrice: 62.5, packQty: null, include: false }],
  ingredients,
);
check('excluded row produces no patch', skipped.patches.size === 0, String(skipped.patches.size));

console.log('9. an unknown product is left for a human, not guessed');
const unknown = receipt.parseReceipt('XYZZY WIDGET 5KG 20.00', ingredients);
check('no ingredient id assigned', !unknown.some((r) => r.ingredientId));
check('row not pre-selected', unknown.every((r) => !r.include));

console.log(failures ? `\nFAIL — ${failures} check(s) failed` : '\nPASS — receipt parsing, pricing and stock rules verified');
process.exit(failures ? 1 : 0);
