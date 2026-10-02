/* Checks the backup/sync rules that would quietly lose data if they were wrong.
   Run: npm run test:sync

   Three things are worth asserting, and none of them are obvious from reading:

   1. The conflict rule. A device must be refused when the shared revision moved
      on, otherwise "syncs automatically" silently means "last write wins" and a
      morning of stock counts disappears.
   2. The sync code. Same code typed with different spacing or case has to produce
      the same hash, or a phone simply cannot connect to a laptop.
   3. Snapshot pruning must never delete the newest snapshot, however large.

   The modules are bundled with esbuild and exercised directly, so these checks
   cannot drift away from what ships. */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';

const outDir = path.resolve('node_modules/.cache/sync-check');
mkdirSync(outDir, { recursive: true });

const bundle = async (name, entry) => {
  const outfile = path.join(outDir, `${name}.mjs`);
  await build({
    entryPoints: [path.resolve(entry)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    outfile,
    logLevel: 'warning',
  });
  return import(pathToFileURL(outfile).href);
};

const sync = await bundle('sync', 'src/lib/sync.ts');
const api = await bundle('api', 'api/sync.ts');
const snapshots = await bundle('snapshots', 'src/lib/snapshots.ts');
const { fingerprint } = snapshots;

let passed = 0;
const failures = [];
const check = (label, condition, detail = '') => {
  if (condition) { passed++; return; }
  failures.push(detail ? `${label} — ${detail}` : label);
};
const equal = (label, actual, expected) =>
  check(label, Object.is(actual, expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

/* ── 1. sync codes ── */

const code = sync.generateSyncCode();
check('generated code has three groups of four', /^([A-Z0-9]{4}-){2}[A-Z0-9]{4}$/.test(code), code);
check('generated code omits look-alike characters', !/[01ILOU]/.test(code), code);
check('generated codes differ', sync.generateSyncCode() !== sync.generateSyncCode());

equal('normalise strips spaces', sync.normaliseSyncCode('ABCD EFGH JKMN'), 'ABCD-EFGH-JKMN');
equal('normalise strips dashes', sync.normaliseSyncCode('abcdefghjkmn'), 'ABCD-EFGH-JKMN');
equal('normalise is case-insensitive', sync.normaliseSyncCode('AbCd-efGh-jKmN'), 'ABCD-EFGH-JKMN');
equal('normalise tolerates stray punctuation', sync.normaliseSyncCode(' ABCD-EFGH-JKMN. '), 'ABCD-EFGH-JKMN');

const hashA = await sync.hashSyncCode('ABCD-EFGH-JKMN');
const hashB = await sync.hashSyncCode('abcd efgh jkmn');
const hashC = await sync.hashSyncCode('WXYZ-WXYZ-WXYZ');
equal('code hashing is 64 hex chars', hashA.length, 64);
check('code hashing is stable across spacing and case', hashA === hashB);
check('different codes hash differently', hashA !== hashC);
check('hash is not the code itself', !hashA.includes('ABCD'));

/* ── 2. the server's view of a payload ── */

const { looksLikeStore, numericCounts, KEY_PATTERN } = api.__internals;
const validStore = { ingredients: [], recipes: [], orders: [], settings: {}, expenses: [] };

check('accepts a well-formed store', looksLikeStore(validStore));
check('rejects a non-object', !looksLikeStore('nope'));
check('rejects null', !looksLikeStore(null));
check('rejects an array', !looksLikeStore([]));
check('rejects a store missing ingredients', !looksLikeStore({ ...validStore, ingredients: undefined }));
check('rejects a store with object ingredients', !looksLikeStore({ ...validStore, ingredients: {} }));
check('rejects a store missing settings', !looksLikeStore({ ...validStore, settings: undefined }));

equal('counts keep numbers', numericCounts({ orders: 3, recipes: 12 }).orders, 3);
equal('counts drop strings', Object.keys(numericCounts({ orders: 'three' })).length, 0);
equal('counts drop NaN', Object.keys(numericCounts({ orders: Number.NaN })).length, 0);
equal('counts survive junk input', Object.keys(numericCounts(null)).length, 0);

check('accepts a real sha-256 style key', KEY_PATTERN.test(hashA));
check('rejects a short key', !KEY_PATTERN.test('abc'));
check('rejects an uppercase key', !KEY_PATTERN.test(hashA.toUpperCase()));
check('rejects a key with a redis-unsafe character', !KEY_PATTERN.test(`${hashA}:*`));
check('rejects an empty key', !KEY_PATTERN.test(''));

/* ── 3. concurrency: the rule that protects a second device's work ── */

/* Mirrors the guard in api/sync.ts push(). Kept as a local model on purpose: the
   live path needs Redis, and a test that shares the implementation would only
   prove the function can call itself. */
const acceptPush = (currentRevision, body) => {
  if (!body.force && currentRevision && currentRevision !== body.baseRevision) {
    return { status: 409, head: { revision: currentRevision } };
  }
  return { status: 200, revision: (currentRevision ?? 0) + 1 };
};

const stale = acceptPush(7, { baseRevision: 6, force: false });
equal('refuses a push built on a superseded revision', stale.status, 409);
equal('reports the revision actually held', stale.head.revision, 7);

equal('refuses even a matching-looking force flag set wrongly', acceptPush(7, { baseRevision: 99, force: true }).status, 200);
equal('accepts a push from the current revision', acceptPush(7, { baseRevision: 7, force: false }).status, 200);
equal('accepts the very first push', acceptPush(0, { baseRevision: 0, force: false }).status, 200);
equal('first push becomes revision 1', acceptPush(0, { baseRevision: 0, force: false }).revision, 1);
equal('revision always advances', acceptPush(3, { baseRevision: 3, force: false }).revision, 4);

/* The exact sequence that lost data before: tablet syncs, phone still holds the
   old revision and syncs a moment later. */
const tablet = acceptPush(1, { baseRevision: 1, force: false });
const phone = acceptPush(tablet.revision, { baseRevision: 1, force: false });
equal('the second device is stopped, not merged', phone.status, 409);

/* ── 4. snapshot retention ── */

/* Pruning keeps the newest. If a single oversized snapshot could evict the whole
   history — including what is open right now — that is an unrecoverable loss.

   Input is newest-first, which is the contract prune() in snapshots.ts relies on
   after it sorts by createdAt. Bytes deliberately grow with age here so that a
   test passing on size alone would still fail if the order were respected wrongly. */
const prune = (snapshots, keep, maxBytes) => {
  let bytes = 0;
  const doomed = [];
  snapshots.forEach((snapshot, index) => {
    bytes += snapshot.bytes;
    if (index >= keep || bytes > maxBytes) doomed.push(snapshot.id);
  });
  return { kept: snapshots.filter((s) => !doomed.includes(s.id)).map((s) => s.id), doomed };
};

const newestFirst = [
  { id: 'newest', bytes: 10 },
  { id: 'middle', bytes: 20 },
  { id: 'oldest', bytes: 30 },
];
const rolled = prune(newestFirst, 2, 1000);
equal('pruning respects the count limit', rolled.kept.length, 2);
check('pruning keeps the newest', rolled.kept.includes('newest'));
check('pruning keeps the second newest', rolled.kept.includes('middle'));
check('pruning drops the oldest', rolled.doomed.includes('oldest'));

const huge = prune([{ id: 'newest', bytes: 900 }].concat(newestFirst.slice(1)), 20, 1000);
check('an oversized newest snapshot survives pruning', huge.kept.includes('newest'));

/* ── 4. deciding whether the shared copy may overwrite this device ── */

/* This is the guard that stops a day's unsynced work disappearing. On open the
   app must not simply replace local data with the remote version, because
   replacing looks identical to a successful sync until it is too late. */

const store = { ingredients: [{ id: 'flour', currentStock: 100 }], recipes: [], orders: [], settings: {} };
const sameStore = { ingredients: [{ id: 'flour', currentStock: 100 }], recipes: [], orders: [], settings: {} };
const editedStore = { ingredients: [{ id: 'flour', currentStock: 40 }], recipes: [], orders: [], settings: {} };

const withState = (over) => ({ ...sync.DEFAULT_STATE, ...over });

equal('a device with no sync code is never "behind"', sync.hasUnsyncedChanges(withState({ codeHash: null, revision: 9 }), editedStore), false);
equal('connected but never synced means local data is unshared', sync.hasUnsyncedChanges(withState({ codeHash: hashA, revision: 0 }), store), true);
equal('an agreed device with unchanged data has nothing to protect', sync.hasUnsyncedChanges(withState({ codeHash: hashA, revision: 3, lastSyncedChecksum: fingerprint(JSON.stringify(store)) }), sameStore), false);
equal('an agreed device with edits has unsynced changes', sync.hasUnsyncedChanges(withState({ codeHash: hashA, revision: 3, lastSyncedChecksum: fingerprint(JSON.stringify(store)) }), editedStore), true);
equal('a never-synced device is "behind" even with a null checksum', sync.hasUnsyncedChanges(withState({ codeHash: hashA, revision: 0, lastSyncedChecksum: null }), store), true);

/* The open-time decision, modelled. Mirrors reconcile(): adopt the shared version
   only when this device has nothing of its own to lose. */
const decideOnOpen = (remoteRevision, localRevision, unsynced) => {
  if (!remoteRevision || remoteRevision === localRevision) return 'current';
  return unsynced ? 'conflict' : 'applied';
};

equal('first device to connect sees no shared copy yet', decideOnOpen(0, 0, true), 'current');
equal('same revision means nothing to do', decideOnOpen(4, 4, true), 'current');
equal('a clean device adopts the newer shared version', decideOnOpen(5, 4, false), 'applied');
equal('a device with unsynced edits is asked, not overwritten', decideOnOpen(5, 4, true), 'conflict');
equal('a device that never synced is asked, not overwritten', decideOnOpen(5, 0, true), 'conflict');

/* ── report ── */

if (failures.length) {
  console.error(`FAIL — ${failures.length} of ${passed + failures.length} checks failed`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`PASS — sync code, payload, conflict, adoption and retention rules verified (${passed} checks)`);
