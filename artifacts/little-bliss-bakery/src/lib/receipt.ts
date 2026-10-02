import type { Ingredient } from './store';
import { convertQty, roundCurrency } from './store';

/* Parsing an OCR'd receipt
   -----------------------
   A thermal receipt gives us lines of text, nothing structured. Every guess this
   module makes is therefore surfaced as a confidence and handed to a human for
   review before anything touches stock or pricing. The rules below are written
   to be *wrong in a visible way* rather than confidently wrong.

   The two judgement calls worth knowing about:

   1. "2 x 5kg" is a count and a pack size, not a 10 kg purchase. We keep both so
      the review screen can ask rather than assume.
   2. A receipt line's last 2-decimal number is its price far more reliably than
      its first number is a quantity. Quantities on receipts are frequently bare
      ("FLOUR 2 89.90"), so a lone leading integer is only treated as a quantity
      when there is no competing interpretation. */

export type ReceiptLine = {
  /** Stable id for React keys and for tracking edits through the review screen. */
  id: string;
  /** The raw OCR line, kept so a wrong guess can be traced back to the source. */
  raw: string;
  /** Best ingredient guess, null when nothing matched confidently. */
  ingredientId: string | null;
  ingredientName: string;
  /** 0..1. Anything below CONFIDENT is shown as needing a human decision. */
  confidence: number;
  /** Quantity in the ingredient's own unit — what actually lands in stock. */
  quantity: number | null;
  /** Quantity exactly as printed, with its printed unit. */
  quantityRaw: number | null;
  quantityUnit: string | null;
  /** Line total in the shop's currency, null when the line had no price. */
  totalPrice: number | null;
  /** When the line reads "N x PACK", this is the size of one pack. */
  packQty: number | null;
  include: boolean;
};

/** At or above this the row is pre-selected; below it a human must confirm. */
export const CONFIDENT = 0.6;
/** Pack size and stock unit must differ by less than this to treat them as equal. */
const EPSILON = 0.001;

/* Words that carry no matching signal. "Large", "bag" and friends appear on
   almost every ingredient line and would otherwise make everything match
   everything. */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'with', 'in', 'for', 'on', 'by', 'per',
  'large', 'small', 'big', 'medium', 'pack', 'packed', 'bag', 'bags', 'box',
  'bottle', 'btl', 'can', 'tin', 'tub', 'jar', 'packet', 'pk', 'sachet',
  'pure', 'fresh', 'new', 'premium', 'quality', 'product', 'x', 'qty', 'ea',
  'g', 'kg', 'ml', 'l', 'lt', 'gm', 'each', 'unit', 'units',
]);

/* Lines that belong to the receipt itself rather than to a purchase: totals,
   tax, payment, store branding. Matching these produces phantom ingredients, so
   they are dropped before matching. Each is anchored where possible — "TOTAL"
   anywhere kills the line, but bare "VAT"/"TAX" only when the line is short,
   because "TOTAL FLOUR" is not a thing but a long line mentioning tax might be. */
const SKIP_PATTERNS: { test: RegExp; strict?: boolean }[] = [
  { test: /^(total|grand\s*total|sub\s*total|amount\s*due|balance\s*due|to\s*pay|amount)\b/i },
  { test: /\b(total\s*due|grand\s*total|amount\s*due|total\s*amount)\b/i },
  { test: /^(vat|tax)\b/i, strict: true },
  { test: /\b(vat|tax|sales\s*tax|tax\s*invoice)\b/i },
  { test: /^(cash|change|visa|mastercard|maestro|cheque|check|debit|credit|card|paid|tender|amount\s*paid|balance)\b/i },
  { test: /\b(thank\s*you|thank\s*u|welcome|receipt|invoice|till|terminal|cashier|server|date|time|order\s*no|transaction|merchant|store|tel|phone|fax|vat\s*no|tax\s*no|company\s*no)\b/i },
  { test: /\b(cash\s*rounded|change\s*due|amount\s*tendered|approved|declined|auth\s*code|reference)\b/i },
  { test: /^\**\s*[*\/]\s*$/ },
  // Rules and dotted leaders used to align the price column.
  { test: /^[-=_*~.\s]{4,}$/ },
  // The shop's own name, and the legal suffixes that end it.
  { test: /\b(suppliers?|supplies|enterprises|trading|enterprise|foods?|bakers?|bakery|pty|ltd|cc|company)\b/i },
];

/** Today as the store writes dates: YYYY-MM-DD. */
const todayISO = (): string => new Date().toISOString().slice(0, 10);

/** Strip currency marks and punctuation, upper-case, collapse whitespace. */
const normalize = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[‐-―]/g, '-')
    .replace(/[^\w\s.,/%()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokensOf = (value: string): string[] =>
  normalize(value)
    .replace(/[.,/%()]/g, ' ')
    .split(' ')
    .filter(Boolean);

const isStopWord = (token: string): boolean => STOP_WORDS.has(token);

/**
 * Reciprocal containment: how much of the ingredient's name appears in the line.
 * Receipts truncate ("CHOCOLATE CHIPS 1KG" for "Dark Chocolate Chips 1kg"), so a
 * strict full-string match fails on almost every real line. Containment in either
 * direction handles both truncation and abbreviated ingredient names.
 */
const scoreLine = (name: string, line: string): number => {
  const nameTokens = tokensOf(name).filter((t) => !isStopWord(t));
  const lineTokens = tokensOf(line);
  if (!nameTokens.length || !lineTokens.length) return 0;

  const hits = nameTokens.filter((token) => lineTokens.some((lt) => lt === token || (lt.length > 3 && token.length > 3 && lt.startsWith(token))));

  if (!hits.length) return 0;
  // Scale by coverage of the ingredient name, not just the raw hit count: matching
  // one word of a four-word ingredient is weak evidence, matching all four is not.
  const coverage = hits.length / nameTokens.length;
  return coverage;
};

/**
 * Best ingredient for a line, or null when nothing clears a low floor. Returns
 * the score alongside the id so the review screen can show *how* sure it is.
 */
export const matchIngredient = (
  line: string,
  ingredients: Ingredient[],
): { ingredientId: string | null; confidence: number } => {
  let best: { id: string; score: number } | null = null;
  for (const ingredient of ingredients) {
    const score = scoreLine(ingredient.name, line);
    if (score > 0 && (!best || score > best.score)) best = { id: ingredient.id, score };
  }
  if (!best) return { ingredientId: null, confidence: 0 };

  // Two candidates within a hair of each other is ambiguity, not confidence.
  const rivals = ingredients.filter((i) => i.id !== best!.id && scoreLine(i.name, line) >= best!.score - 0.001);
  if (rivals.length) return { ingredientId: null, confidence: Math.round(best.score * 100) / 100 };

  return { ingredientId: best.id, confidence: Math.round(best.score * 100) / 100 };
};

type QuantityRead = { raw: number | null; unit: string | null; packQty: number | null };

/* Ordered longest-first so "KGS" is not matched as "G", and captured as its own
   group so the caller gets the printed unit without re-parsing. */
const UNIT_PATTERN = 'KGS?|KILOS?|GRAMS?|GMS?|LITRES?|LITERS?|LTRS?|MLS?|EACH|PCS?|EA|G|M|L';

/**
 * Read quantity, printed unit and pack size from one line.
 *
 * Order matters: "N x SIZE UNIT" must be tried before a bare quantity, otherwise
 * the "1" in "2 x 5kg" gets read as the quantity.
 */
export const parseQuantity = (line: string): QuantityRead => {
  const text = normalize(line);
  if (!text) return { raw: null, unit: null, packQty: null };

  const toNumber = (value: string): number => Number(value.replace(/\s/g, '').replace(',', '.'));

  // 2 X 5KG — a count of packs, each of a stated size. We keep the pack size and
  // leave the count to the review screen, because "is this 10kg or 2 packs of
  // 5kg?" changes stock by 10x and only the buyer knows.
  const pack = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*[Xx*]\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})\\b`).exec(text);
  if (pack) return { raw: toNumber(pack[1]), unit: pack[3].toLowerCase(), packQty: toNumber(pack[2]) };

  // SIZE UNIT — an explicit, unambiguous quantity.
  const sized = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})\\b`).exec(text);
  if (sized) return { raw: toNumber(sized[1]), unit: sized[2].toLowerCase(), packQty: null };

  // A leading bare integer ("FLOUR 2 89.90") is the last resort; callers treat it
  // as a hint, not a fact.
  const leading = /(?:^|\s)(\d{1,6})(?=\s|$)/.exec(text);
  if (leading) return { raw: toNumber(leading[1]), unit: null, packQty: null };

  return { raw: null, unit: null, packQty: null };
};

/**
 * The line total. On a receipt the trailing figure with cents is the price; the
 * leading bare number is far more often a quantity or a size.
 */
export const parseTotal = (line: string): number | null => {
  const text = normalize(line);
  const matches = [...text.matchAll(/(?:E|R|ZAR|\$)\s?(\d{1,6}[.,]\d{2})\b|(\d{1,6}[.,]\d{2})\b/g)];
  if (!matches.length) return null;
  const last = matches[matches.length - 1];
  const value = last[1] ?? last[2];
  if (!value) return null;
  const amount = Number(value.replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
};

const isSkippable = (line: string): boolean =>
  SKIP_PATTERNS.some(({ test, strict }) => (strict ? line.trim().length <= 14 && test.test(line) : test.test(line)));

let seq = 0;

/**
 * Turn raw OCR text into reviewable rows. Only lines that plausibly describe a
 * purchase survive; the rest are dropped so the user never has to dismiss them.
 */
export const parseReceipt = (text: string, ingredients: Ingredient[]): ReceiptLine[] => {
  const lines = text
    .split('\n')
    .map((raw) => raw.replace(/\s+/g, ' ').trim())
    .filter((raw) => raw.length >= 3 && !isSkippable(raw));

  /* Receipts wrap long product names onto their own line and print the size and
     price underneath. Recognised individually that produces a nameless row with a
     quantity, so a recognised line with nothing but a name is joined with the line
     below it when that line carries figures but no name of its own. */
  const joined: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    const next = lines[i + 1];
    const namedHere = matchIngredient(current, ingredients).ingredientId !== null;
    const namedNext = next ? matchIngredient(next, ingredients).ingredientId !== null : true;
    const nextIsFiguresOnly = Boolean(next) && !namedNext && /^\d/.test(next!);
    if (namedHere && nextIsFiguresOnly && parseQuantity(current).raw === null) {
      joined.push(`${current} ${next}`);
      i++;
    } else {
      joined.push(current);
    }
  }

  const rows: ReceiptLine[] = [];
  const claimed = new Set<string>();

  for (const raw of joined) {
    const { ingredientId, confidence } = matchIngredient(raw, ingredients);
    // One ingredient once: a receipt repeats a product name in the totals block
    // often enough that duplicates are more misleading than a missed line.
    if (ingredientId && claimed.has(ingredientId)) continue;
    if (ingredientId) claimed.add(ingredientId);

    const quantityRead = parseQuantity(raw);
    const ingredient = ingredientId ? ingredients.find((i) => i.id === ingredientId) ?? null : null;
    const totalPrice = parseTotal(raw);

    // A bare leading integer that is also the line's only figure is a quantity.
    // If a price was read too, the integer was probably part of it.
    let quantity = quantityRead.raw;
    if (quantity !== null && quantityRead.unit === null && totalPrice !== null && quantityRead.raw === Number.parseInt(String(totalPrice), 10)) {
      quantity = null;
    }

    let quantityUnit = quantityRead.unit;
    let packQty = quantityRead.packQty;
    if (ingredient) {
      // Fold the printed unit into the ingredient's unit. convertQty returns null
      // across dimensions (each vs grams) and we then leave the value untouched
      // for the user rather than pretending the conversion is safe.
      const converted = quantity === null ? null : convertQty(quantity, quantityUnit ?? ingredient.unit, ingredient.unit);
      if (converted !== null) quantity = Math.round(converted * 1000) / 1000;
      if (quantityUnit === null) quantityUnit = ingredient.unit;
      const packConverted = packQty === null ? null : convertQty(packQty, quantityUnit ?? ingredient.unit, ingredient.unit);
      if (packConverted !== null) packQty = Math.round(packConverted * 1000) / 1000;
      // A pack the same size as the quantity means the receipt said nothing new.
      if (packQty !== null && quantity !== null && Math.abs(packQty - quantity) < EPSILON) packQty = null;
    }

    rows.push({
      id: `line-${++seq}`,
      raw,
      ingredientId,
      ingredientName: ingredient?.name ?? '',
      confidence,
      quantity,
      quantityRaw: quantityRead.raw,
      quantityUnit,
      totalPrice,
      packQty,
      include: Boolean(ingredientId) && confidence >= CONFIDENT,
    });
  }

  return rows;
};

export type ReceiptApplyResult = {
  /** Stock received, in each ingredient's own unit. */
  stockAdded: number;
  /** Ingredients whose recorded price changed. */
  priceChanges: { name: string; from: number; to: number }[];
  /** Ingredients whose priceHistory gained an entry. */
  historyAdded: number;
};

/**
 * Price of one pack implied by a receipt line. Defaults the pack size to the
 * quantity received, which is correct for the common case of one pack per line and
 * keeps the unit cost right even when several packs were bought.
 */
export const impliedUnitCost = (line: ReceiptLine, ingredient: Ingredient): number | null => {
  if (line.totalPrice === null || line.totalPrice <= 0) return null;
  const packSize = line.packQty ?? line.quantity;
  if (packSize === null || packSize <= 0) return null;
  return line.totalPrice / packSize;
};

/**
 * Build the ingredient patches a confirmed receipt implies. Pure: the caller
 * decides what to persist, which keeps the price rules testable and lets the
 * review screen preview the effect before the user commits.
 */
export const buildReceiptUpdates = (
  lines: ReceiptLine[],
  ingredients: Ingredient[],
): { patches: Map<string, Ingredient>; stockAdded: number; priceChanges: ReceiptApplyResult['priceChanges']; historyAdded: number } => {
  const patches = new Map<string, Ingredient>();
  let stockAdded = 0;
  const priceChanges: ReceiptApplyResult['priceChanges'] = [];
  let historyAdded = 0;

  for (const line of lines) {
    if (!line.include || !line.ingredientId) continue;
    const base = patches.get(line.ingredientId) ?? ingredients.find((i) => i.id === line.ingredientId);
    if (!base) continue;

    const quantity = line.quantity ?? 0;
    const newStock = Math.round((base.currentStock + Math.max(0, quantity)) * 1000) / 1000;

    let next: Ingredient = { ...base, currentStock: newStock };
    const unitCostNow = impliedUnitCost(line, base);
    if (unitCostNow !== null && Number.isFinite(unitCostNow)) {
      const newPackSize = line.packQty ?? line.quantity;
      if (newPackSize !== null && newPackSize > 0) next = { ...next, packSize: newPackSize };
      next = { ...next, purchasePrice: roundCurrency(line.totalPrice!), purchaseDate: todayISO() };

      const previousUnitCost = base.packSize > 0 && base.purchasePrice > 0 ? base.purchasePrice / base.packSize : null;
      // History tracks the *unit* price, not the ticket. A supplier moving from a
      // 25 kg to a 10 kg bag changes purchasePrice with no change in what the
      // bakery pays per gram, and logging that as a price rise would make every
      // trend chart lie. 1% tolerance absorbs OCR and rounding noise.
      const moved = previousUnitCost === null || Math.abs(unitCostNow - previousUnitCost) > previousUnitCost * 0.01;
      if (moved) {
        const history = [...(base.priceHistory || [])];
        const last = history[history.length - 1];
        if (!last || last.price !== next.purchasePrice) history.push({ date: todayISO(), price: next.purchasePrice });
        next = { ...next, priceHistory: history };
        historyAdded++;
        if (previousUnitCost !== null) priceChanges.push({ name: base.name, from: roundCurrency(previousUnitCost), to: roundCurrency(unitCostNow) });
      }
    }

    stockAdded += quantity;
    patches.set(line.ingredientId, next);
  }

  return { patches, stockAdded: roundCurrency(stockAdded), priceChanges, historyAdded };
};
