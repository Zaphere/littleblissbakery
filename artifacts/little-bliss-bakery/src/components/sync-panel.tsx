import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CircleAlert, Cloud, CloudOff, Copy, Download, History, KeyRound, Loader2, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react';

import type { Store } from '@/lib/store';
import { deleteSnapshot, fingerprint, getSnapshot, listSnapshots, takeSnapshotOrNull, type SnapshotMeta } from '@/lib/snapshots';
import {
  attachSyncCode, detachSyncCode, ensureDevice, forcePush, generateSyncCode, getSyncState, reconcile, resolveWithRemote,
  setDeviceName, syncNow, type SyncResult, type SyncState,
} from '@/lib/sync';

/* Shared backup and history
   -------------------------
   Two problems this screen exists to solve:

   1. "Which backup is the newest one?" Previously every backup was a loose
      `little-bliss-backup-<date>.json`, and the history list recorded nothing
      restorable — so the only way to find out was to open every file. Snapshots
      are now real, restorable, device-labelled and timestamped, newest first.

   2. "Every device sees the same one." With a sync code set, this device can push
      and pull against one shared copy, so the tablet, the phone and the office
      laptop agree on which update is latest.

   Sync is strictly additive: with no code set, this screen is local-only and
   nothing leaves the device. Nothing is overwritten without a confirmation, and
   every restore takes a safety snapshot first. */

const cx = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');

const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = cx(buttonClass, 'bg-primary text-primary-foreground hover:opacity-90');
const softButton = cx(buttonClass, 'bg-secondary text-secondary-foreground hover:brightness-95');
const ghostButton = cx(buttonClass, 'text-muted-foreground hover:bg-muted hover:text-foreground');
const dangerButton = cx(buttonClass, 'bg-destructive text-destructive-foreground hover:opacity-90');
const cardClass = 'rounded-xl border bg-card text-card-foreground shadow-sm';
const inputClass = 'h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/65 focus:border-primary focus:ring-2 focus:ring-primary/15';
const fieldClass = 'block space-y-1.5 text-sm font-medium';

/** Human summary of what a snapshot held, so the list is not just dates. */
const describeCounts = (counts: Record<string, number>): string => {
  const names: Record<string, string> = {
    ingredients: 'ingredients', recipes: 'recipes', orders: 'orders',
    expenses: 'expenses', transactions: 'stock moves', clients: 'clients', reservations: 'reservations',
  };
  const parts = Object.entries(counts)
    .filter(([key]) => names[key])
    .map(([key, value]) => `${value} ${names[key]}`);
  return parts.length ? parts.join(' · ') : 'bakery data';
};

const when = (iso: string): string => {
  const date = new Date(iso);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  return date.toLocaleDateString('en-SZ', { day: '2-digit', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};

const reasonLabel = (reason: string): string => ({
  manual: 'Manual backup', restore: 'After a restore', 'pre-restore': 'Safety copy', sync: 'Synced', auto: 'Automatic',
}[reason] ?? reason);

export function SyncPanel({ store, update }: { store: Store; update: (patch: Partial<Store>) => void }) {
  const [sync, setSync] = useState<SyncState>(() => ensureDevice());
  const [history, setHistory] = useState<SnapshotMeta[]>([]);
  const [status, setStatus] = useState<'idle' | 'working' | 'offline'>('idle');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [deviceName, setDeviceNameDraft] = useState(sync.deviceName);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  /* Serialising the whole store is not cheap, and the history list needs this on
     every render — so it is computed once per store change rather than once per row. */
  const currentChecksum = useMemo(() => fingerprint(JSON.stringify(store)), [store]);
  const storeRef = useRef(store);
  storeRef.current = store;

  const refreshHistory = useCallback(async () => {
    setHistory(await listSnapshots());
  }, []);

  useEffect(() => { void refreshHistory(); }, [refreshHistory]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  /** Tell the person what happened in their words, not in HTTP codes. */
  const report = useCallback((result: SyncResult) => {
    switch (result.kind) {
      case 'pushed':
        setNotice({ tone: 'ok', text: `Backed up to the shared store. This is now the newest version (revision ${result.revision}).` });
        setSync(getSyncState());
        return;
      case 'pulled':
        setNotice({ tone: 'ok', text: `Loaded the newest version from ${result.head.device}.` });
        setSync(getSyncState());
        return;
      case 'up-to-date':
        setNotice({ tone: 'ok', text: 'Already up to date. No other device has a newer version.' });
        setSync(getSyncState());
        return;
      case 'conflict':
        setNotice({ tone: 'warn', text: `${result.conflict.remoteDevice} saved changes more recently. Choose which version to keep.` });
        setSync(getSyncState());
        return;
      case 'error':
        setNotice({ tone: 'error', text: result.message });
    }
  }, []);

  /** Reconciling on open is what makes "open the tablet and it's current" true —
   *  but only when this device has nothing unshared. Otherwise the conflict is
   *  surfaced for a decision instead, so offline edits are never dropped. */
  const reconcileOnOpen = useCallback(async () => {
    const state = getSyncState();
    if (!state.codeHash || !navigator.onLine) return;
    setStatus('working');
    const result = await reconcile(storeRef.current);
    setStatus('idle');

    if (result.kind === 'applied') {
      update(result.store);
      await takeSnapshotOrNull(result.store, state.deviceName, 'sync');
      await refreshHistory();
      setNotice({ tone: 'ok', text: `Loaded the newest version from ${result.head.device}.` });
      setSync(getSyncState());
      return;
    }
    if (result.kind === 'conflict') {
      setNotice({ tone: 'warn', text: `${result.conflict.remoteDevice} saved changes more recently. Choose which version to keep.` });
      setSync(getSyncState());
      return;
    }
    // Being unable to reach sync on open is not worth interrupting the day over;
    // the status strip already says so and the data is intact locally.
    setSync(getSyncState());
  }, [refreshHistory, update]);

  useEffect(() => { void reconcileOnOpen(); }, [reconcileOnOpen]);

  /** Push once edits settle, so a burst of typing is one request, not fifty. */
  useEffect(() => {
    const state = getSyncState();
    if (!state.codeHash || !navigator.onLine || state.pending) return;
    const timer = setTimeout(async () => {
      setStatus('working');
      report(await syncNow(storeRef.current));
      setStatus('idle');
      await refreshHistory();
    }, 12000);
    return () => clearTimeout(timer);
  }, [store, report, refreshHistory]);

  const doSync = async () => {
    setStatus('working');
    report(await syncNow(store));
    setStatus('idle');
    await refreshHistory();
  };

  const manualBackup = async () => {
    await takeSnapshotOrNull(store, sync.deviceName, 'manual');
    await refreshHistory();
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `little-bliss-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice({ tone: 'ok', text: 'Saved to this device and downloaded a copy you can keep off-site.' });
  };

  /** Restore takes a safety snapshot first, so a wrong tap is recoverable. */
  const restore = async (id: string) => {
    const target = history.find((h) => h.id === id);
    if (!target) return;
    const isNewest = history[0]?.id === id;
    const warning = isNewest
      ? 'This will replace the data currently open on this device.'
      : `This is an older backup from ${when(target.createdAt)}. Everything saved since then on this device will be replaced.`;
    if (!window.confirm(`${warning}\n\nA safety copy of the current data is kept in the history below, so nothing is lost for good. Continue?`)) return;

    setBusyId(id);
    const snapshot = await getSnapshot(id);
    if (!snapshot) { setBusyId(null); setNotice({ tone: 'error', text: 'That backup could not be read from this device.' }); return; }

    await takeSnapshotOrNull(store, sync.deviceName, 'pre-restore');
    update(snapshot.data);
    await refreshHistory();
    setBusyId(null);
    setNotice({ tone: 'ok', text: 'Restored. Use Sync now to share it with your other devices.' });
  };

  const importFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Store;
        if (!Array.isArray(parsed.ingredients) || !Array.isArray(parsed.recipes) || !parsed.settings) throw new Error('shape');
        if (!window.confirm('This replaces all current data on this device. A safety copy is kept in the history below. Continue?')) return;
        await takeSnapshotOrNull(store, sync.deviceName, 'pre-restore');
        update(parsed);
        await refreshHistory();
        setNotice({ tone: 'ok', text: 'Backup file restored.' });
      } catch {
        setNotice({ tone: 'error', text: 'That file is not a readable Little Bliss backup.' });
      }
    };
    reader.readAsText(file);
  };

  const saveDeviceName = () => {
    setSync(setDeviceName(deviceName));
    setNotice({ tone: 'ok', text: `This device will show as "${deviceName.trim() || sync.deviceName}" in the history.` });
  };

  const saveCode = async () => {
    const code = codeInput.trim();
    if (!code) return;
    setStatus('working');
    await attachSyncCode(code);
    setCodeInput('');
    setNotice({ tone: 'ok', text: 'Sync code saved. Syncing with the other devices now…' });
    setStatus('idle');
    setSync(getSyncState());
    await doSync();
  };

  const copyCode = async () => {
    if (!generatedCode) return;
    try { await navigator.clipboard.writeText(generatedCode); } catch { /* clipboard blocked; the code is on screen */ }
    setNotice({ tone: 'ok', text: 'Code copied. Paste it into the other devices.' });
  };

  const keepRemote = async () => {
    setStatus('working');
    const result = await resolveWithRemote();
    setStatus('idle');
    if (result.kind === 'pulled') {
      /* Taking the other device's version discards whatever was unsynced here, so
         that state is snapshotted first — otherwise the choice is a one-way door. */
      await takeSnapshotOrNull(store, sync.deviceName, 'pre-restore');
      update(result.store);
      report(result);
    } else if (result.kind === 'up-to-date') {
      setSync(getSyncState());
      setNotice({ tone: 'ok', text: 'There was nothing newer to load.' });
    } else {
      report(result);
    }
    await refreshHistory();
  };

  const keepLocal = async () => {
    setStatus('working');
    report(await forcePush(store));
    setStatus('idle');
    await refreshHistory();
  };

  const removeHistory = async (id: string) => {
    await deleteSnapshot(id);
    await refreshHistory();
  };

  const connected = Boolean(sync.codeHash);
  const conflicted = Boolean(sync.conflict);

  return (
    <div className="stagger">
      {/* Conflicts get the top of the screen. An unsaved morning of stock counts
          must never sit below a fold on a page about backups. */}
      {conflicted && sync.conflict && (
        <section className="mb-5 rounded-xl border-2 border-amber-400 bg-amber-50 p-5 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <CircleAlert size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Two devices changed the data</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <strong>{sync.conflict.remoteDevice}</strong> saved a version at {when(sync.conflict.remoteUpdatedAt)}, after this device last synced.
                Nothing has been overwritten. Choose which version to keep — either way the other is kept in the history.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={primaryButton} onClick={() => void keepRemote()} disabled={status === 'working'}>
                  <RefreshCw size={16} /> Use {sync.conflict.remoteDevice}&rsquo;s version
                </button>
                <button className={dangerButton} onClick={() => void keepLocal()} disabled={status === 'working'}>
                  <Upload size={16} /> Keep this device&rsquo;s version
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {notice && (
        <div className={cx(
          'mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm',
          notice.tone === 'ok' && 'border-green-300 bg-green-50 text-green-900 dark:bg-green-950/30',
          notice.tone === 'warn' && 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30',
          notice.tone === 'error' && 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/30',
        )}>
          {notice.tone === 'ok' ? <Check size={18} className="mt-0.5 shrink-0" /> : <CircleAlert size={18} className="mt-0.5 shrink-0" />}
          <span className="min-w-0 flex-1">{notice.text}</span>
          <button className={ghostButton} style={{ minHeight: 0 }} onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ── shared sync ── */}
        <section className={cardClass}>
          <div className="border-b p-5">
            <div className="flex items-center gap-3">
              <span className={cx('rounded-lg p-2', connected ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground')}>
                {connected ? <Cloud size={18} /> : <CloudOff size={18} />}
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold">Shared backup</h2>
                <p className="text-xs text-muted-foreground">
                  {connected
                    ? sync.lastSyncedAt
                      ? `Last synced ${when(sync.lastSyncedAt)} · newest update from ${sync.lastAuthor ?? 'this device'}`
                      : 'Connected, not synced yet'
                    : 'Not connected — backups stay on this device'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className={cx('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium',
              !online ? 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30'
                : status === 'working' ? 'border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950/30'
                : sync.pending ? 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30'
                : 'border-green-300 bg-green-50 text-green-900 dark:bg-green-950/30')}>
              {!online ? <CircleAlert size={14} /> : status === 'working' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {!online ? 'Offline — edits are saved here and will sync when the connection returns'
                : status === 'working' ? 'Syncing…'
                : sync.pending ? 'Waiting to sync'
                : connected ? 'Up to date' : 'Local only'}
            </div>

            {connected ? (
              <>
                <button className={cx(primaryButton, 'w-full')} onClick={() => void doSync()} disabled={status === 'working' || !online}>
                  <RefreshCw size={16} className={status === 'working' ? 'animate-spin' : ''} /> Sync now
                </button>
                <div className="space-y-1.5">
                  <label className={fieldClass}>
                    <span>This device is called</span>
                    <input className={inputClass} value={deviceName} onChange={e => setDeviceNameDraft(e.target.value)} onBlur={saveDeviceName} placeholder="e.g. Office laptop" />
                  </label>
                  <p className="text-xs text-muted-foreground">Shown beside each backup so you can tell the tablet from the phone.</p>
                </div>
                <button className={cx(ghostButton, 'w-full')} onClick={() => { detachSyncCode(); setSync(getSyncState()); setNotice({ tone: 'ok', text: 'Sync disconnected. Backups stay on this device.' }); }}>
                  Disconnect this device
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Set one sync code and every device that has it will share the same backup, so the newest update is the same everywhere.
                </p>
                {generatedCode ? (
                  <div className="space-y-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your new sync code</p>
                    <p className="mono select-all text-2xl font-bold tracking-[.2em]">{generatedCode}</p>
                    <div className="flex flex-wrap gap-2">
                      <button className={softButton} onClick={() => void copyCode()}><Copy size={16} /> Copy</button>
                      <button
                        className={primaryButton}
                        onClick={async () => { await attachSyncCode(generatedCode); setGeneratedCode(null); setSync(getSyncState()); await doSync(); }}
                      >
                        <Check size={16} /> Use this code on this device
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Keep this somewhere safe. Type it into your other devices to connect them. Anyone with the code can read and change your bakery data.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button className={cx(softButton, 'w-full')} onClick={() => setGeneratedCode(generateSyncCode())}>
                      <KeyRound size={16} /> Create a new sync code
                    </button>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex-1 border-t" />or use an existing one<span className="flex-1 border-t" /></div>
                    <div className="flex gap-2">
                      <input
                        className={inputClass}
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX-XXXX"
                        aria-label="Sync code"
                      />
                      <button className={softButton} onClick={() => void saveCode()} disabled={!codeInput.trim()}>Connect</button>
                    </div>
                  </div>
                )}
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                  Only the code&rsquo;s hash is stored on this device and on the server. The code itself is never written down anywhere.
                </p>
              </>
            )}
          </div>
        </section>

        {/* ── file backups, which need no account ── */}
        <section className={cardClass}>
          <div className="border-b p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-secondary p-2 text-secondary-foreground"><Download size={18} /></span>
              <div>
                <h2 className="font-semibold">Backup file</h2>
                <p className="text-xs text-muted-foreground">A copy you can email or keep in the cloud. Works with no account.</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-5">
            <button className={cx(primaryButton, 'w-full')} onClick={() => void manualBackup()}>
              <Download size={16} /> Save a backup file
            </button>
            <input type="file" accept=".json,.application/json" onChange={importFile} className="hidden" id="lb-import" />
            <button className={cx(softButton, 'w-full')} onClick={() => document.getElementById('lb-import')?.click()}>
              <Upload size={16} /> Restore from a backup file
            </button>
            <p className="text-xs text-muted-foreground">
              Restoring replaces everything currently on this device. A safety copy is kept in the history below first.
            </p>
          </div>
        </section>
      </div>

      {/* ── history ── */}
      <section className={cx(cardClass, 'mt-5 overflow-hidden')}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Backup history</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {history.length
                ? `${history.length} restorable ${history.length === 1 ? 'backup' : 'backups'}, newest first`
                : 'A snapshot is taken automatically as you work'}
            </p>
          </div>
          <History size={18} className="text-muted-foreground" />
        </div>

        {history.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
            <span className="mb-3 rounded-full bg-secondary p-3 text-secondary-foreground"><History size={22} /></span>
            <h3 className="font-semibold">No backups yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              One is taken for you as you work, and you can make one now at any time.
            </p>
            <div className="mt-4"><button className={softButton} onClick={() => void manualBackup()}>Take the first backup</button></div>
          </div>
        ) : (
          <ul className="divide-y">
            {history.map((snapshot, index) => {
              const newest = index === 0;
              /* A snapshot that differs from what is open now has unsynced work
                 behind it. Compared against the pre-computed fingerprint below
                 rather than re-serialising the store once per row. */
              const behindCurrent = newest && snapshot.reason !== 'pre-restore' && snapshot.checksum !== currentChecksum;
              return (
                <li key={snapshot.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{when(snapshot.createdAt)}</p>
                      {newest && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Newest</span>}
                      {snapshot.synced && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">Shared</span>}
                      {behindCurrent && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Changes since</span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {snapshot.device} · {reasonLabel(snapshot.reason)} · {(snapshot.bytes / 1024).toFixed(1)} KB
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{describeCounts(snapshot.counts)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className={softButton} onClick={() => void restore(snapshot.id)} disabled={busyId === snapshot.id}>
                      {busyId === snapshot.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Restore
                    </button>
                    <button className={ghostButton} aria-label="Delete this backup" title="Delete this backup" onClick={() => void removeHistory(snapshot.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
