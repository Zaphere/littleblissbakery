/* Shared backup endpoint
   ----------------------
   One namespace per bakery, derived from SHA-256 of the sync code. Because the
   namespace *is* the credential, a wrong code addresses a different, empty
   namespace rather than failing a comparison — there is no data to leak.

   Backed by Upstash Redis or Vercel KV over plain REST, so there is no database
   client dependency and no connection string to rotate in a serverless function.

   Concurrency rule: a push carries the revision the client believes is current.
   If that no longer matches, someone else has synced since, and we refuse with
   409 plus the current head instead of overwriting their work. */

type MinimalRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type MinimalResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): MinimalResponse;
  json(body: unknown): void;
};

type Head = {
  revision: number;
  snapshotId: string;
  createdAt: string;
  device: string;
  reason: string;
  bytes: number;
  checksum: string;
  counts: Record<string, number>;
};

type PushBody = {
  baseRevision?: unknown;
  force?: unknown;
  snapshot?: Partial<Head>;
  data?: unknown;
};

const KEY_HEADER = 'x-sync-key';
const KEY_PATTERN = /^[a-f0-9]{64}$/;
const MAX_BODY_BYTES = 3_500_000;
const SNAPSHOT_TTL_SECONDS = 60 * 60 * 24 * 90;
const HISTORY_LIMIT = 20;
const WRITE_LIMIT = 60;
const READ_LIMIT = 300;

const headKey = (ns: string) => `lb:${ns}:head`;
const snapshotKey = (ns: string, id: string) => `lb:${ns}:snap:${id}`;
const recentKey = (ns: string) => `lb:${ns}:recent`;
const rateKey = (ns: string, bucket: string, window: number) => `lb:${ns}:rl:${bucket}:${Math.floor(Date.now() / (window * 1000))}`;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const cleanString = (value: unknown, max: number): string => (typeof value === 'string' ? value.slice(0, max) : '');

/** Counts are advisory metadata for the history list, so drop anything non-numeric
 *  rather than trusting the shape the client claims. */
const numericCounts = (value: unknown): Record<string, number> => {
  const record = asRecord(value);
  if (!record) return {};
  const counts: Record<string, number> = {};
  for (const [key, count] of Object.entries(record)) {
    if (typeof count === 'number' && Number.isFinite(count)) counts[key.slice(0, 40)] = count;
  }
  return counts;
};

/**
 * A bakery store is not any JSON object. Checking the shape here keeps a
 * malformed or hostile payload out of the shared history, where it would later be
 * handed back to a device that expects a real store.
 */
const looksLikeStore = (value: unknown): boolean => {
  const store = asRecord(value);
  if (!store) return false;
  if (!Array.isArray(store.ingredients) || !Array.isArray(store.recipes) || !Array.isArray(store.orders)) return false;
  return isPlainObject(store.settings);
};

export default async function handler(req: MinimalRequest, res: MinimalResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const redis = connectRedis();
  if (!redis) {
    res.status(503).json({ error: 'sync_unavailable', message: 'Sync is not configured on this deployment.' });
    return;
  }

  const rawKey = req.headers[KEY_HEADER];
  const key = (Array.isArray(rawKey) ? rawKey[0] : rawKey ?? '').trim().toLowerCase();
  if (!KEY_PATTERN.test(key)) {
    res.status(401).json({ error: 'bad_key', message: 'A valid sync code is required.' });
    return;
  }
  const namespace = key;

  const url = new URL(req.url ?? '/', 'http://localhost');
  const action = url.searchParams.get('action') ?? (req.method === 'POST' ? 'push' : 'pull');

  const method = (req.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (action === 'push' && method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (action !== 'push' && method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const limit = action === 'push' ? WRITE_LIMIT : READ_LIMIT;
  const windowSeconds = 60;
  try {
    const hits = await redis<number>(['INCR', rateKey(namespace, action, windowSeconds)], 'number');
    if (hits === 1) await redis(['EXPIRE', rateKey(namespace, action, windowSeconds), String(windowSeconds)], 'number');
    if (hits > limit) {
      res.setHeader('Retry-After', String(windowSeconds));
      res.status(429).json({ error: 'rate_limited', message: 'Too many sync attempts. Try again shortly.' });
      return;
    }
  } catch {
    // A rate-limit counter that cannot be stored must not block the bakery from
    // backing up. Fail open here; the code gate is the real access control.
  }

  try {
    if (action === 'push') return await push(redis, namespace, req.body, res);
    if (action === 'history') return await history(redis, namespace, res);
    return await pull(redis, namespace, res);
  } catch (cause) {
    console.error('sync error', cause);
    res.status(500).json({ error: 'server_error', message: 'Sync failed. Your data is safe on this device.' });
  }
}

async function pull(redis: Redis, namespace: string, res: MinimalResponse): Promise<void> {
  const head = await readHead(redis, namespace);
  if (!head) {
    res.status(200).json({ revision: 0, head: null, store: null });
    return;
  }
  const snapshot = await readJson<{ meta: Head; data: unknown }>(redis, snapshotKey(namespace, head.snapshotId));
  res.status(200).json({ revision: head.revision, head, store: snapshot?.data ?? null });
}

async function history(redis: Redis, namespace: string, res: MinimalResponse): Promise<void> {
  const raw = await redis<string[] | null>(['LRANGE', recentKey(namespace), '0', String(HISTORY_LIMIT - 1)], 'bulk');
  const snapshots = (raw ?? []).map((entry) => { try { return JSON.parse(entry) as Head; } catch { return null; } }).filter(Boolean);
  res.status(200).json({ snapshots });
}

async function push(redis: Redis, namespace: string, body: unknown, res: MinimalResponse): Promise<void> {
  const parsed = asRecord(body) as PushBody | null;
  if (!parsed || !isPlainObject(parsed.snapshot) || !looksLikeStore(parsed.data)) {
    res.status(400).json({ error: 'bad_request', message: 'That payload is not a valid bakery backup.' });
    return;
  }

  const snapshot = parsed.snapshot;
  const size = JSON.stringify(parsed.data).length;
  if (size > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'too_large', message: 'That backup is too large for the shared store.' });
    return;
  }

  const baseRevision = typeof parsed.baseRevision === 'number' && Number.isFinite(parsed.baseRevision) ? parsed.baseRevision : 0;
  const force = parsed.force === true;
  const current = await readHead(redis, namespace);

  // Optimistic concurrency: only accept this write if the client saw the same head
  // we hold. Otherwise two devices would silently overwrite each other.
  if (!force && current && current.revision !== baseRevision) {
    res.status(409).json({
      error: 'conflict',
      head: current,
      message: 'Another device synced more recently.',
    });
    return;
  }

  const meta: Head = {
    revision: (current?.revision ?? 0) + 1,
    snapshotId: cleanString(snapshot.snapshotId, 120) || `s${Date.now().toString(36)}`,
    createdAt: cleanString(snapshot.createdAt, 40) || new Date().toISOString(),
    device: cleanString(snapshot.device, 80) || 'Unknown device',
    reason: cleanString(snapshot.reason, 24) || 'sync',
    bytes: size,
    checksum: cleanString(snapshot.checksum, 32),
    counts: numericCounts(snapshot.counts),
  };

  const entry = JSON.stringify({ id: meta.snapshotId, createdAt: meta.createdAt, device: meta.device, reason: meta.reason, bytes: meta.bytes, checksum: meta.checksum, counts: meta.counts });
  const stored = await redis<string[] | null>([
    'EVAL',
    // Store the payload, publish it as head, and trim the history in one step so
    // head can never point at a snapshot that failed to write.
    'redis.call("SET", KEYS[2], ARGV[1], "EX", ARGV[3]) '
      + 'redis.call("SET", KEYS[1], ARGV[2]) '
      + 'redis.call("LPUSH", KEYS[3], ARGV[4]) '
      + 'redis.call("LTRIM", KEYS[3], 0, tonumber(ARGV[5])) '
      + 'return "OK"',
    '4',
    headKey(namespace),
    snapshotKey(namespace, meta.snapshotId),
    recentKey(namespace),
    '',
    JSON.stringify({ meta, data: parsed.data }),
    JSON.stringify(meta),
    String(SNAPSHOT_TTL_SECONDS),
    entry,
    String(HISTORY_LIMIT - 1),
  ], 'bulk');

  if (!stored || String(stored) !== 'OK') {
    res.status(500).json({ error: 'write_failed', message: 'The backup could not be saved to the shared store.' });
    return;
  }

  res.status(200).json({ revision: meta.revision, head: meta });
}

async function readHead(redis: Redis, namespace: string): Promise<Head | null> {
  const raw = await redis<string | null>(['GET', headKey(namespace)], 'bulk');
  if (!raw) return null;
  try {
    const head = JSON.parse(raw) as Head;
    return typeof head?.revision === 'number' ? head : null;
  } catch {
    return null;
  }
}

async function readJson<T>(redis: Redis, key: string): Promise<T | null> {
  const raw = await redis<string | null>(['GET', key], 'bulk');
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

/* ── Upstash / Vercel KV REST ── */

type Redis = <T>(command: (string | number)[], mode: 'bulk' | 'number') => Promise<T>;

function connectRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const call: Redis = async <T>(command: (string | number)[], mode: 'bulk' | 'number'): Promise<T> => {
    const response = await fetch(url as string, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    if (!response.ok) throw new Error(`redis responded ${response.status}`);
    const payload = (await response.json()) as { result?: unknown; error?: unknown };
    if (payload.error) throw new Error(String(payload.error));
    return (mode === 'number' ? Number(payload.result) : payload.result) as T;
  };

  return call;
}

/** Exported for the self-test harness so the payload rules can be checked. */
export const __internals = { looksLikeStore, numericCounts, KEY_PATTERN, MAX_BODY_BYTES };
