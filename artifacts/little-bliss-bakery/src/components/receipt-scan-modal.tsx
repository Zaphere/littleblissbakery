import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CircleAlert, Loader2, RefreshCw, ScanLine, Trash2, Upload, X } from 'lucide-react';

import { unitCost, type Ingredient } from '@/lib/store';
import { buildReceiptUpdates, CONFIDENT, parseReceipt, type ReceiptLine } from '@/lib/receipt';

/** Shared class-name joiner; the modal is deliberately free of app-wide deps. */
const cx = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');

/* Receipt scanning
   ---------------
   The camera path is the point of this screen: a buyer standing in a supplier's
   queue photographs the till slip rather than typing twelve lines on a phone.
   Everything after recognition is a review table, because OCR is never certain
   enough to move stock without a human confirming it.

   The wasm core is ~4 MB and is only fetched when a scan actually starts, so
   opening Inventory stays as fast as it is today. */

type Stage = 'capture' | 'reading' | 'review' | 'error';

type ApplyResult = {
  patches: Map<string, Ingredient>;
  stockAdded: number;
  priceChanges: { name: string; from: number; to: number }[];
};

type Props = {
  ingredients: Ingredient[];
  onApply: (result: ApplyResult) => void;
  onClose: () => void;
  money: (n: number) => string;
};

/** Files served by scripts/sync-ocr.mjs. A version bump there is a path bump here. */
const ASSET_BASE = '/vendor/tesseract/6.0.1';

const Progress = ({ value, label }: { value: number; label: string }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
    <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round(Math.max(0.04, value) * 100)}%` }} />
    <span className="sr-only">{label}</span>
  </div>
);

export function ReceiptScanModal({ ingredients, onApply, onClose, money }: Props) {
  const [stage, setStage] = useState<Stage>('capture');
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<ReceiptLine[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Preparing…');
  const [error, setError] = useState('');
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const workerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);

  // The worker holds tens of MB of wasm and a language model. Leaving it running
  // after the dialog closes would keep a phone awake and hot for nothing.
  useEffect(() => () => { void workerRef.current?.terminate(); }, []);

  const scan = async (file: File) => {
    setStage('reading');
    setProgress(0.02);
    setStatus('Loading the reader…');
    setError('');

    let worker: { recognize: (image: unknown) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown>; setParameters: (params: Record<string, string>) => Promise<unknown> } | null = null;
    try {
      // tesseract.js ships as CommonJS, so after Rollup the named export is not
      // on the module namespace — it sits under the interop default. Read both so
      // the import keeps working whichever shape the bundler produced.
      const mod = await import('tesseract.js');
      const createWorker = (mod as { createWorker?: unknown }).createWorker
        ?? ((mod as { default?: { createWorker?: unknown } }).default?.createWorker);
      if (typeof createWorker !== 'function') throw new Error('the offline reader could not be loaded');

      worker = await (createWorker as typeof import('tesseract.js').createWorker)('eng', 1, {
        workerPath: `${ASSET_BASE}/worker.min.js`,
        corePath: ASSET_BASE,
        langPath: ASSET_BASE,
        logger: (m: { status?: string; progress?: number }) => {
          if (typeof m.progress === 'number') setProgress(m.progress);
          if (m.status) setStatus(m.status);
        },
      });
      workerRef.current = worker;
      // Receipts are upright, evenly lit and printed in a plain serif face. The
      // default page segmentation spends a lot of effort on layout that a till
      // slip does not have; SINGLE_BLOCK reads the whole image as one column,
      // which is what we want because we split it into lines ourselves.
      await worker.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' });
      setStatus('Reading the receipt…');
      const { data } = await worker.recognize(file);
      await worker.terminate();
      workerRef.current = null;

      const parsed = parseReceipt(data.text, ingredients);
      setRows(parsed);
      setStage('review');
    } catch (cause) {
      await worker?.terminate().catch(() => {});
      workerRef.current = null;
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(
        /Failed to load|network|404|Failed to fetch/i.test(message)
          ? 'The offline reader could not load its files. Reconnect once, then scan again — after that it works without signal.'
          : `Could not read that image: ${message}`,
      );
      setStage('error');
    }
  };

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    void scan(file);
  };

  const patchRow = (id: string, patch: Partial<ReceiptLine>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const result = useMemo(() => buildReceiptUpdates(rows, ingredients), [rows, ingredients]);
  const selected = rows.filter((row) => row.include && row.ingredientId);
  const unmatched = rows.filter((row) => !row.ingredientId).length;
  // Rows already matched but below the confidence floor: shown as selected (the
  // match is plausible) yet flagged, because a wrong ingredient id is worse than
  // a wrong number.
  const needsReview = rows.filter((row) => row.include && row.confidence < CONFIDENT).length;

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-foreground/35 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Scan a supplier receipt" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[92dvh] w-full overflow-auto rounded-t-2xl border bg-card p-5 shadow-2xl sm:max-w-3xl sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="display text-2xl font-semibold">Scan a receipt</h2>
            <p className="mt-1 text-sm text-muted-foreground">Photograph the till slip, check what was read, then add it to stock.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X size={18} /></button>
        </div>

        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={onFile} />

        {stage === 'capture' && (
          <div className="space-y-4">
            <button type="button" onClick={() => cameraInput.current?.click()} className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary/35 bg-primary/[.04] px-6 py-10 text-center transition-colors hover:border-primary/60 hover:bg-primary/[.07]">
              <span className="rounded-full bg-primary/12 p-3.5 text-primary"><Camera size={24} /></span>
              <span className="text-base font-semibold">Photograph the receipt</span>
              <span className="max-w-xs text-xs leading-relaxed text-muted-foreground">Fill the frame with the slip and keep it flat. Works without a signal once the reader has loaded.</span>
            </button>
            <button type="button" onClick={() => galleryInput.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-muted">
              <Upload size={16} /> Choose an existing photo
            </button>
          </div>
        )}

        {stage === 'reading' && (
          <div className="space-y-4">
            {preview && <img src={preview} alt="The receipt being read" className="mx-auto max-h-52 rounded-lg border object-contain" />}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 font-medium"><Loader2 size={13} className="animate-spin text-primary" />{status}</span><span className="mono text-muted-foreground">{Math.round(progress * 100)}%</span></div>
              <Progress value={progress} label={status} />
            </div>
            <p className="text-center text-xs text-muted-foreground">First scan downloads the reader (~10 MB). Later scans open instantly, online or off.</p>
          </div>
        )}

        {stage === 'error' && (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"><CircleAlert size={18} className="mt-0.5 shrink-0 text-destructive" /><p className="text-sm leading-relaxed">{error}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStage('capture')} className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Try another photo</button>
              <button type="button" onClick={() => galleryInput.current?.click()} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Choose a photo</button>
            </div>
          </div>
        )}

        {stage === 'review' && (
          <div className="space-y-4">
            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <ScanLine size={22} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-semibold">No ingredients recognised</p>
                <p className="mt-1 text-xs text-muted-foreground">Try a sharper photo, or fill the slip in by hand.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">{selected.length} of {rows.length} selected</span>
                  {needsReview > 0 && <span className="rounded-full bg-accent px-2.5 py-1 text-muted-foreground">{needsReview} low-confidence — check these</span>}
                  {unmatched > 0 && <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{unmatched} not on your list</span>}
                </div>

                <div className="divide-y overflow-hidden rounded-xl border">
                  {rows.map((row) => {
                    const ingredient = row.ingredientId ? ingredients.find((i) => i.id === row.ingredientId) ?? null : null;
                    const wasCost = ingredient ? unitCost(ingredient) : null;
                    const newCost = row.totalPrice && (row.packQty ?? row.quantity) ? row.totalPrice / (row.packQty ?? row.quantity!) : null;
                    const moved = wasCost !== null && newCost !== null && Math.abs(newCost - wasCost) > wasCost * 0.01;
                    return (
                      <div key={row.id} className={cx('p-3 transition-opacity', !row.include && 'opacity-45')}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={row.include}
                            onChange={(e) => patchRow(row.id, { include: e.target.checked })}
                            disabled={!row.ingredientId}
                            aria-label={`Include ${row.ingredientName || row.raw}`}
                            className="mt-1.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={row.ingredientId ?? ''}
                                onChange={(e) => {
                                  const id = e.target.value || null;
                                  patchRow(row.id, {
                                    ingredientId: id,
                                    ingredientName: ingredients.find((i) => i.id === id)?.name ?? '',
                                    confidence: id ? 1 : 0,
                                    include: Boolean(id),
                                  });
                                }}
                                aria-label="Ingredient"
                                className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs font-medium outline-none focus:border-primary"
                              >
                                <option value="">Not matched — pick one</option>
                                {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                              </select>
                              {ingredient && <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{ingredient.unit}</span>}
                            </div>

                            <div className="flex flex-wrap items-end gap-2">
                              <label className="text-[10px] font-medium text-muted-foreground">
                                Quantity
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.quantity ?? ''}
                                  onChange={(e) => patchRow(row.id, { quantity: e.target.value === '' ? null : Number(e.target.value) })}
                                  className="mt-0.5 h-8 w-20 rounded-md border bg-background px-2 font-mono text-xs outline-none focus:border-primary"
                                />
                              </label>
                              <label className="text-[10px] font-medium text-muted-foreground">
                                Pack size
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.packQty ?? ''}
                                  placeholder={row.quantity != null ? String(row.quantity) : '—'}
                                  onChange={(e) => patchRow(row.id, { packQty: e.target.value === '' ? null : Number(e.target.value) })}
                                  className="mt-0.5 h-8 w-20 rounded-md border bg-background px-2 font-mono text-xs outline-none focus:border-primary"
                                />
                              </label>
                              <label className="text-[10px] font-medium text-muted-foreground">
                                Paid
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.totalPrice ?? ''}
                                  placeholder="0.00"
                                  onChange={(e) => patchRow(row.id, { totalPrice: e.target.value === '' ? null : Number(e.target.value) })}
                                  className="mt-0.5 h-8 w-24 rounded-md border bg-background px-2 font-mono text-xs outline-none focus:border-primary"
                                />
                              </label>
                              {ingredient && row.quantity != null && (
                                <span className="pb-1.5 text-[10px] text-muted-foreground">
                                  on hand {ingredient.currentStock.toLocaleString()} → <strong className="font-mono">{(ingredient.currentStock + row.quantity).toLocaleString()}</strong> {ingredient.unit}
                                </span>
                              )}
                            </div>

                            {moved && (
                              <p className="text-[10px] font-medium text-amber-700">
                                Price moved: {money(wasCost!)} → {money(newCost!)} per {ingredient!.unit}. Recorded on the ingredient.
                              </p>
                            )}

                            <p className="truncate text-[10px] text-muted-foreground" title={row.raw}>read as: {row.raw}</p>
                          </div>
                          <button type="button" onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))} aria-label="Remove line" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-xs text-muted-foreground">
                <p>Adds <strong className="font-mono text-foreground">{result.stockAdded.toLocaleString()}</strong> to stock{result.priceChanges.length > 0 && <> · <strong className="text-amber-700">{result.priceChanges.length} price change{result.priceChanges.length !== 1 ? 's' : ''}</strong></>}.</p>
                <p className="mt-0.5 text-[10px]">Only unit prices that really moved are added to price history.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setRows([]); setStage('capture'); }} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted"><RefreshCw size={13} /> Scan another</button>
                <button
                  type="button"
                  disabled={selected.length === 0}
                  onClick={() => onApply(result)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  Add to stock
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
