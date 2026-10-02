import type { Store } from './store';

/* Snapshot history
   ----------------
   The old `backupRecords` list in the store recorded a timestamp and a size for a
   backup that never existed as data — and because it lived inside `Store`,
   restoring an older file erased the record of newer ones. It could never restore
   anything, which is why backups ended up scattered across devices as loose
   `little-bliss-backup-*.json` files with no way to tell which was newest.

   A snapshot here is the real thing: the whole store, restorable. They live in
   IndexedDB rather than localStorage because localStorage caps out around 5 MB and
   a busy bakery's history would fill that with the first few entries.

   This layer is local-only and always works, with or without a sync account. */

/** What a snapshot says about itself, without loading its (large) payload. */
export type SnapshotMeta = {
  id: string;
  createdAt: string;
  /** Which device took it, so a phone and a laptop can be told apart. */
  device: string;
  /** Why it was taken: 'auto' | 'manual' | 'restore' | 'sync' | 'pre-restore'. */
  reason: string;
  bytes: number;
  /** Short content fingerprint. A mismatch means the payload is not what it claims. */
  checksum: string;
  /** Record counts, so the history list can show what each snapshot held. */
  counts: Record<string, number>;
  /** True once this snapshot has been accepted by the shared sync store. */
  synced: boolean;
};

export type Snapshot = { meta: SnapshotMeta; data: Store };

const DB_NAME = 'little-bliss-snapshots';
const DB_VERSION = 1;
const STORE = 'snapshots';

/** How many snapshots to keep before dropping the oldest. */
export const KEEP_SNAPSHOTS = 20;
/** Stop dropping once the retained window would exceed this, so one huge snapshot
 *  cannot quietly discard the entire history. */
export const MAX_HISTORY_BYTES = 80 * 1024 * 1024;

/** Short, fast content fingerprint. Display and tamper-check only, never security. */
export const fingerprint = (value: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

const countFields = (store: Store): Record<string, number> => {
  const fields: (keyof Store)[] = ['ingredients', 'recipes', 'orders', 'expenses', 'transactions', 'clients', 'reservations'];
  const counts: Record<string, number> = {};
  for (const field of fields) {
    const value = store[field];
    if (Array.isArray(value)) counts[field] = value.length;
  }
  return counts;
};

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'meta.id' });
        os.createIndex('createdAt', 'meta.createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'));
  });
  return dbPromise;
};

const tx = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB request failed'));
  });
};

const newId = (): string => `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Newest first. */
const byNewest = (a: Snapshot, b: Snapshot): number => b.meta.createdAt.localeCompare(a.meta.createdAt);

/**
 * Take a snapshot of the given store. Cheap enough to call on a timer, which is
 * what makes "the newest one is always there" true even after a crash.
 */
export const takeSnapshot = async (store: Store, device: string, reason = 'auto'): Promise<SnapshotMeta> => {
  const serialised = JSON.stringify(store);
  const meta: SnapshotMeta = {
    id: newId(),
    createdAt: new Date().toISOString(),
    device,
    reason,
    bytes: serialised.length,
    checksum: fingerprint(serialised),
    counts: countFields(store),
    synced: false,
  };
  await tx('readwrite', (os) => os.put({ meta, data: JSON.parse(serialised) } as Snapshot));
  await prune();
  return meta;
};

export const listSnapshots = async (): Promise<SnapshotMeta[]> => {
  try {
    const all = (await tx<Snapshot[]>('readonly', (os) => os.getAll() as IDBRequest<Snapshot[]>)) ?? [];
    return all.sort(byNewest).map((s) => s.meta);
  } catch {
    // Private browsing and locked-down profiles can refuse IndexedDB. History is a
    // convenience, so degrade to "no history" rather than breaking the app.
    return [];
  }
};

export const getSnapshot = async (id: string): Promise<Snapshot | null> => {
  try {
    return (await tx<Snapshot | undefined>('readonly', (os) => os.get(id))) ?? null;
  } catch {
    return null;
  }
};

export const markSynced = async (ids: string[]): Promise<void> => {
  if (!ids.length) return;
  try {
    const snapshots = await tx<Snapshot[]>('readonly', (os) => os.getAll() as IDBRequest<Snapshot[]>);
    const targets = snapshots.filter((s) => ids.includes(s.meta.id));
    await Promise.all(targets.map((s) => tx('readwrite', (os) => os.put({ ...s, meta: { ...s.meta, synced: true } }))));
  } catch { /* history is best-effort */ }
};

export const deleteSnapshot = async (id: string): Promise<void> => {
  try { await tx('readwrite', (os) => os.delete(id)); } catch { /* best-effort */ }
};

/** Drop the oldest snapshots past the retention limits. */
export const prune = async (): Promise<void> => {
  try {
    const all = ((await tx<Snapshot[]>('readonly', (os) => os.getAll() as IDBRequest<Snapshot[]>)) ?? []).sort(byNewest);
    const doomed: string[] = [];
    let bytes = 0;
    all.forEach((snapshot, index) => {
      bytes += snapshot.meta.bytes;
      if (index >= KEEP_SNAPSHOTS || bytes > MAX_HISTORY_BYTES) doomed.push(snapshot.meta.id);
    });
    if (doomed.length) await Promise.all(doomed.map((id) => tx('readwrite', (os) => os.delete(id))));
  } catch { /* best-effort */ }
};

/**
 * A restorable snapshot of `store`, or null when IndexedDB is unavailable. Callers
 * that must not silently lose a safety net should check for null and say so.
 */
export const takeSnapshotOrNull = async (store: Store, device: string, reason: string): Promise<SnapshotMeta | null> => {
  try {
    return await takeSnapshot(store, device, reason);
  } catch {
    return null;
  }
};
