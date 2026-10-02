import type { Store } from './store';
import { fingerprint, listSnapshots, markSynced, takeSnapshot } from './snapshots';

/* Sync
   ----
   "Every device sees the same backup, and the most recent update wins" — but a
   silent last-writer-wins is exactly how you lose a morning's stock counts. If
   two devices both changed things since the last sync, the second one to sync is
   refused and the person chooses. Nothing is ever overwritten without that choice.

   All of it is optional. With no sync code set, this module does nothing and the
   app behaves exactly as before: local-only, offline-first, no requests. */

const STATE_KEY = 'little-bliss-sync-v1';

export type SyncState = {
  /** Which device this is, and a name the bakery will recognise. */
  deviceId: string;
  deviceName: string;
  /** SHA-256 of the sync code. The code itself is never stored — only this. */
  codeHash: string | null;
  /** The shared revision this device last agreed with. 0 = never synced. */
  revision: number;
  /** Fingerprint of the store as it stood at the last successful sync. Anything
   *  different now means this device holds edits the shared store never accepted. */
  lastSyncedChecksum: string | null;
  /** Revision of the newest snapshot held locally, used to detect local edits. */
  localRevision: number;
  lastSyncedAt: string | null;
  /** Who made the update currently held locally. */
  lastAuthor: string | null;
  pending: boolean;
  /** Set when the remote has moved on and the person has not chosen yet. */
  conflict: SyncConflict | null;
};

export type SyncConflict = {
  remoteRevision: number;
  remoteDevice: string;
  remoteUpdatedAt: string;
  remoteCounts: Record<string, number>;
  localUpdatedAt: string | null;
};

export const DEFAULT_STATE: SyncState = {
  deviceId: '',
  deviceName: '',
  codeHash: null,
  revision: 0,
  lastSyncedChecksum: null,
  localRevision: 0,
  lastSyncedAt: null,
  lastAuthor: null,
  pending: false,
  conflict: null,
};

/* ── device identity ──
   localStorage can throw in private mode, so every access is guarded. Sync is a
   convenience; losing the device name must never break the app. */
const readState = (): SyncState => {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<SyncState>) };
  } catch {
    return { ...DEFAULT_STATE };
  }
};

const writeState = (next: SyncState): void => {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
};

/** A short guess at what this device is, so history reads "iPad" not "unknown". */
export const guessDeviceName = (): string => {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? '';
  const os = /android/i.test(navigator.userAgent) ? 'Android'
    : /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'iOS'
    : /mac/i.test(platform) ? 'Mac'
    : /win/i.test(platform) ? 'Windows'
    : /linux/i.test(platform) ? 'Linux' : '';
  const kind = /ipad|tablet/i.test(navigator.userAgent) ? 'Tablet'
    : /mobi|iphone|android/i.test(navigator.userAgent) ? 'Phone' : 'Computer';
  const osLabel = os ? `${os} ` : '';
  return `${osLabel}${kind}`.trim() || 'This device';
};

export const getSyncState = (): SyncState => readState();

/** Fingerprint of the store exactly as it currently stands. */
const currentChecksum = (store: Store): string => fingerprint(JSON.stringify(store));

/**
 * Does this device hold work the shared store has not accepted?
 *
 * This is the question that decides whether a newer shared version may be applied
 * on open. Answering it wrong loses a day's work: overwriting unsaved edits with
 * the remote copy looks exactly like a successful sync until it is too late.
 */
export const hasUnsyncedChanges = (state: SyncState, store: Store): boolean => {
  if (!state.codeHash) return false;
  // Connected but never agreed on a revision: everything local is unshared, so a
  // remote copy must never simply replace it.
  if (state.revision === 0) return true;
  return state.lastSyncedChecksum !== currentChecksum(store);
};

/** Ensure a stable deviceId/deviceName exist, without touching sync settings. */
export const ensureDevice = (): SyncState => {
  const state = readState();
  if (state.deviceId && state.deviceName) return state;
  const next: SyncState = {
    ...state,
    deviceId: `dev-${Math.random().toString(36).slice(2, 10)}`,
    deviceName: guessDeviceName(),
  };
  writeState(next);
  return next;
};

export const setDeviceName = (name: string): SyncState => {
  const next = { ...ensureDevice(), deviceName: name.trim() || guessDeviceName() };
  writeState(next);
  return next;
};

/* ── sync code ──
   Human-typed, so the alphabet drops characters that get confused when read off a
   screen and typed by hand: O/0, I/1/L and U/V. 12 symbols from 30 is ~59 bits,
   which stays meaningful against an attacker while being typeable. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const CODE_GROUPS = 3;
const CODE_LENGTH = 4;

export const generateSyncCode = (): string => {
  const bytes = new Uint8Array(CODE_GROUPS * CODE_LENGTH);
  crypto.getRandomValues(bytes);
  const symbols = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  const groups = symbols.reduce<string[]>((acc, _s, i) => {
    if (i % CODE_LENGTH === 0) acc.push('');
    acc[acc.length - 1] += symbols[i];
    return acc;
  }, []);
  return groups.join('-');
};

/** Normalise so "abcd-efgh-jkmn" and "ABCD EFGH JKMN" are the same code. */
export const normaliseSyncCode = (code: string): string =>
  code.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(new RegExp(`(.{${CODE_LENGTH}})`, 'g'), '$1-').replace(/-$/, '');

export const hashSyncCode = async (code: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normaliseSyncCode(code)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/* ── wire format ── */

export type RemoteSnapshot = {
  id: string;
  createdAt: string;
  device: string;
  reason: string;
  bytes: number;
  checksum: string;
  counts: Record<string, number>;
};

export type SyncHead = {
  revision: number;
  snapshotId: string;
  createdAt: string;
  device: string;
  counts: Record<string, number>;
};

const ENDPOINT = '/api/sync';
/** Refuse to ship something the server will reject; keeps the error message honest. */
const MAX_PAYLOAD_BYTES = 6 * 1024 * 1024;
const TIMEOUT_MS = 20000;

const request = async (path: string, init: RequestInit, codeHash: string): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${ENDPOINT}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}), 'x-sync-key': codeHash },
    });
  } finally {
    clearTimeout(timer);
  }
};

export type SyncResult =
  | { kind: 'pushed'; revision: number }
  | { kind: 'pulled'; revision: number; store: Store; head: SyncHead }
  | { kind: 'up-to-date'; revision: number }
  | { kind: 'conflict'; conflict: SyncConflict }
  | { kind: 'error'; message: string };

/** Turn an HTTP status into something a bakery owner can act on. */
const describe = (status: number): string => {
  if (status === 401 || status === 403) return 'That sync code was not accepted. Check it on the device that set it up.';
  if (status === 404) return 'Sync is not available on this deployment yet.';
  if (status === 413) return 'That backup is too large for the sync store.';
  if (status === 429) return 'Too many sync attempts. Wait a minute and try again.';
  if (status >= 500) return 'The sync service is unavailable. Your data is safe on this device.';
  return `Sync failed (${status}). Your data is safe on this device.`;
};

/**
 * Reconcile this device with the shared store.
 *
 * A push only succeeds when nobody else has moved the revision on. If they have,
 * we come back as a conflict carrying what the remote holds, and the person
 * decides — this is the difference between "syncs automatically" and "loses your
 * stock counts".
 */
export const syncNow = async (localStore: Store): Promise<SyncResult> => {
  const state = ensureDevice();
  if (!state.codeHash) return { kind: 'error', message: 'No sync code is set on this device.' };
  if (!navigator.onLine) return { kind: 'error', message: 'This device is offline. Nothing was sent.' };

  const payload = JSON.stringify(localStore);

  /* Nothing has changed since the newest snapshot, so pushing would put an
     identical entry into the history on every device for no reason. The one
     exception is a pending state, where the earlier attempt is owed a push. */
  const newest = (await listSnapshots())[0];
  if (newest && newest.checksum === fingerprint(payload) && !state.pending) {
    writeState({ ...state, pending: false });
    return { kind: 'up-to-date', revision: state.revision };
  }

  if (payload.length > MAX_PAYLOAD_BYTES) {
    return { kind: 'error', message: 'This bakery has grown past what the sync store accepts. Export a file backup instead.' };
  }

  try {
    const meta = await takeSnapshot(localStore, state.deviceName, 'sync');

    const snapshot: RemoteSnapshot = {
      id: meta.id,
      createdAt: meta.createdAt,
      device: meta.device,
      reason: meta.reason,
      bytes: meta.bytes,
      checksum: meta.checksum,
      counts: meta.counts,
    };

    const response = await request('?action=push', {
      method: 'POST',
      body: JSON.stringify({
        baseRevision: state.revision,
        force: false,
        snapshot,
        data: localStore,
      }),
    }, state.codeHash);

    if (response.status === 409) {
      const body = (await response.json()) as { head: SyncHead };
      const conflict: SyncConflict = {
        remoteRevision: body.head.revision,
        remoteDevice: body.head.device,
        remoteUpdatedAt: body.head.createdAt,
        remoteCounts: body.head.counts ?? {},
        localUpdatedAt: meta.createdAt,
      };
      writeState({ ...state, conflict, pending: true });
      return { kind: 'conflict', conflict };
    }

    if (!response.ok) return { kind: 'error', message: describe(response.status) };

    const body = (await response.json()) as { revision: number };
    writeState(agree(state, localStore, body.revision, state.deviceName));
    await markSynced([meta.id]);
    return { kind: 'pushed', revision: body.revision };
  } catch (cause) {
    const aborted = cause instanceof DOMException && cause.name === 'AbortError';
    return { kind: 'error', message: aborted ? 'Sync timed out. Your data is safe on this device.' : 'Could not reach the sync service. Your data is safe on this device.' };
  }
};

/** Fetch the newest shared snapshot without recording anything locally. */
type RemoteCopy = { revision: number; head: SyncHead | null; store: Store | null };

const fetchRemote = async (state: SyncState): Promise<{ remote: RemoteCopy } | { error: string }> => {
  try {
    const response = await request('?action=pull', {}, state.codeHash as string);
    if (!response.ok) return { error: describe(response.status) };
    return { remote: (await response.json()) as RemoteCopy };
  } catch {
    return { error: 'Could not reach the sync service.' };
  }
};

/** Record that this device and the shared store now agree on `store`. */
const agree = (state: SyncState, store: Store, revision: number, author: string): SyncState => ({
  ...state,
  revision,
  localRevision: revision,
  lastSyncedChecksum: currentChecksum(store),
  pending: false,
  conflict: null,
  lastSyncedAt: new Date().toISOString(),
  lastAuthor: author,
});

export type ReconcileResult =
  | { kind: 'applied'; revision: number; head: SyncHead; store: Store }
  | { kind: 'current'; revision: number }
  | { kind: 'conflict'; conflict: SyncConflict }
  | { kind: 'error'; message: string };

/**
 * What to do on open: adopt a newer shared version, or hold off and ask.
 *
 * The check that matters is `hasUnsyncedChanges`. A device that has never synced
 * yet, or that edited while offline, holds work the shared copy does not have —
 * applying the remote version there would discard it without a word.
 */
export const reconcile = async (localStore: Store): Promise<ReconcileResult> => {
  const state = ensureDevice();
  if (!state.codeHash) return { kind: 'error', message: 'No sync code is set on this device.' };
  if (!navigator.onLine) return { kind: 'error', message: 'This device is offline.' };

  const fetched = await fetchRemote(state);
  if ('error' in fetched) return { kind: 'error', message: fetched.error };

  const { remote } = fetched;
  // Nothing shared yet, or the shared copy has not moved on since we last agreed.
  if (!remote.head || !remote.store || remote.revision === state.revision) {
    return { kind: 'current', revision: state.revision };
  }

  if (hasUnsyncedChanges(state, localStore)) {
    const conflict: SyncConflict = {
      remoteRevision: remote.revision,
      remoteDevice: remote.head.device,
      remoteUpdatedAt: remote.head.createdAt,
      remoteCounts: remote.head.counts ?? {},
      localUpdatedAt: null,
    };
    // Deliberately not recording the remote revision: this device has still not
    // agreed with it, so the next sync must keep offering the choice.
    writeState({ ...state, conflict, pending: true });
    return { kind: 'conflict', conflict };
  }

  writeState(agree(state, remote.store, remote.revision, remote.head.device));
  return { kind: 'applied', revision: remote.revision, head: remote.head, store: remote.store };
};

/** Adopt the shared version now. Only ever called after a person chose it. */
export const pullLatest = async (): Promise<SyncResult> => {
  const state = ensureDevice();
  if (!state.codeHash) return { kind: 'error', message: 'No sync code is set on this device.' };
  if (!navigator.onLine) return { kind: 'error', message: 'This device is offline.' };

  const fetched = await fetchRemote(state);
  if ('error' in fetched) return { kind: 'error', message: fetched.error };

  const { remote } = fetched;
  if (!remote.head || !remote.store) {
    writeState({ ...state, lastSyncedAt: new Date().toISOString() });
    return { kind: 'up-to-date', revision: 0 };
  }
  writeState(agree(state, remote.store, remote.revision, remote.head.device));
  return { kind: 'pulled', revision: remote.revision, store: remote.store, head: remote.head };
};

/* ── conflict resolution ──
   Both paths snapshot first, so choosing wrong is recoverable from history rather
   than being a dead end. */

/** Take the shared version. The local state is snapshotted first, not discarded. */
export const resolveWithRemote = async (): Promise<SyncResult> => {
  const result = await pullLatest();
  if (result.kind === 'pulled' || result.kind === 'up-to-date') {
    writeState({ ...readState(), conflict: null });
  }
  return result;
};

/** Keep this device's version and overwrite the shared one. Explicit opt-in only. */
export const forcePush = async (localStore: Store): Promise<SyncResult> => {
  const state = ensureDevice();
  if (!state.codeHash) return { kind: 'error', message: 'No sync code is set on this device.' };
  if (!navigator.onLine) return { kind: 'error', message: 'This device is offline. Nothing was sent.' };

  try {
    const meta = await takeSnapshot(localStore, state.deviceName, 'sync');
    const response = await request('?action=push', {
      method: 'POST',
      body: JSON.stringify({
        baseRevision: state.revision,
        force: true,
        snapshot: { id: meta.id, createdAt: meta.createdAt, device: meta.device, reason: meta.reason, bytes: meta.bytes, checksum: meta.checksum, counts: meta.counts },
        data: localStore,
      }),
    }, state.codeHash);
    if (!response.ok) return { kind: 'error', message: describe(response.status) };
    const body = (await response.json()) as { revision: number };
    writeState(agree(state, localStore, body.revision, state.deviceName));
    await markSynced([meta.id]);
    return { kind: 'pushed', revision: body.revision };
  } catch {
    return { kind: 'error', message: 'Could not reach the sync service.' };
  }
};

export const attachSyncCode = async (code: string): Promise<string | null> => {
  const hash = await hashSyncCode(code);
  const state = ensureDevice();
  writeState({ ...state, codeHash: hash, conflict: null, pending: false });
  return hash;
};

export const detachSyncCode = (): void => {
  const state = readState();
  writeState({ ...state, codeHash: null, revision: 0, localRevision: 0, pending: false, conflict: null, lastAuthor: null });
};

