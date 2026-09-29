import { useEffect, useMemo, useRef, useState, createContext, useContext, type ReactNode, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Route, Switch, Link, useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive, ArrowDownRight, ArrowUpRight, Banknote, BarChart3, BookOpen, Box, CalendarDays, Check, ChevronRight, ClipboardList,
  CircleAlert, CircleDollarSign, Download, Eye, EyeOff, FileText, Grape, LayoutDashboard, Map as MapIcon, Menu, Package,
  Pencil, Pin, Plus, Receipt, RefreshCw, Search, Settings as SettingsIcon, Sparkles,
  Trash2, TrendingUp, Upload, Wallet, X, SlidersHorizontal,
  Bell, History, Home, MoreHorizontal, ChevronLeft, ChevronDown, Clock, Edit3, Users, Flame, Lock
} from 'lucide-react';
import { InvoiceDocument } from '@/components/invoice-document';
import { BakingReportDocument } from '@/components/baking-report-document';
import { KitchenOrderDocument } from '@/components/kitchen-order-document';
import { RecipesPrintDocument } from '@/components/recipes-print-document';
import { BakingReferenceCards } from '@/components/baking-reference-cards';
import { BakingReferencePrintDocument } from '@/components/baking-reference-print-document';
import { KitchenOrderFormDocument } from '@/components/kitchen-order-form-document';
import { ShoppingListDocument } from '@/components/shopping-list-document';
import { StockCheckSheetDocument } from '@/components/stock-check-sheet-document';
import { formatInvoiceNumber, getNextInvoiceNumber, loadStore, saveStore, resetStore, unitCost, costOfRecipe, costOfRow, recipeCostIssues, recipeIssueLabel, convertQty, UNIT_OPTIONS, costPerDozen, unitsFor, UNITS_PER_DOZEN, ingredientUsageForOrder, ingredientUsageForOrders, projectedStock, doughLeftover, today, createAuditEntry, createNotification, unreadCount, calculateOrderTotal, calculateOrderCost, calculateOrderOutstanding, roundCurrency, INGREDIENT_CATEGORIES, getCustomerAnalytics, type Store, type Ingredient, type Recipe, type Order, type Expense, type InventoryTransaction, type BudgetAllocation, type AuditLogEntry, type Notification, type Client, type RecipeVersion, type StaffTask, type DeliveryRoute, type WhatsAppMessage, type BackupRecord, type OrderItem, calculateSalesAnalytics, generateProductionSchedule, generatePurchaseOrders, upsertReservation, releaseReservations, issueReservation, reservationForOrder, reservationValue, reservedQuantityByIngredient, availableStock, preBakePlan, reservedBatchCount, issuedBatchCount, type MaterialReservation, type ReservationStatus, type PreBakePlan, REVENUE_PERIODS, revenueOrders, inRevenuePeriod, revenuePeriodLabel, type RevenuePeriod } from '@/lib/store';
import { parseExcelFile, buildImportData, type ParsedInvoice, type ImportResult } from '@/lib/excel-import';
import { useIsMobile } from '@/hooks/use-mobile';
import '@/index.css';

const StoreContext = createContext<{ store: Store; update: (patch: Partial<Store>) => void }>({ store: loadStore(), update: () => undefined });
const useStore = () => useContext(StoreContext);
const money = (n: number) => `E${n.toLocaleString('en-SZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortDate = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-SZ', { day: '2-digit', month: 'short' });
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

/* Dashboard quick actions deep-link with ?new=1 / ?invoice=<id>. wouter's
   useLocation() only yields the pathname, so the query is read through
   useSearch() and stripped again afterwards — otherwise the modal would
   re-open every time the effect re-ran. */
const clearSearchParam = (key: string) => {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(key)) return;
  params.delete(key);
  const qs = params.toString();
  window.history.replaceState(window.history.state, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
};
const cx = (...v: (string | false | undefined)[]) => v.filter(Boolean).join(' ');

function parseOrderText(text: string, recipes: Recipe[]): { customerName: string; items: { productId: string; quantity: number; unitPrice: number; costSnapshot: number }[]; dueDate: string; notes: string } {
  const cleaned = text.replace(/\n/g, ' ').trim();
  let customerName = '';
  const nameMatch = cleaned.match(/(?:from|for|name|customer|hi|hey|hello)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch) customerName = nameMatch[1].trim();
  const today = new Date();
  let dueDate = today.toISOString().slice(0, 10);
  const dayNames: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  const lower = cleaned.toLowerCase();
  for (const [dayName, dayNum] of Object.entries(dayNames)) {
    if (lower.includes(dayName)) {
      const d = new Date(today);
      d.setDate(d.getDate() + ((dayNum - d.getDay() + 7) % 7 || 7));
      dueDate = d.toISOString().slice(0, 10);
      break;
    }
  }
  if (lower.includes('tomorrow')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    dueDate = d.toISOString().slice(0, 10);
  } else if (lower.includes('today')) {
    dueDate = today.toISOString().slice(0, 10);
  } else if (lower.includes('next week')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    dueDate = d.toISOString().slice(0, 10);
  }
  const quantityWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  const items: { productId: string; quantity: number; unitPrice: number; costSnapshot: number }[] = [];
  const segments = cleaned.toLowerCase().split(/(?:,|and|&|\n)/);
  for (const seg of segments) {
    const s = seg.trim();
    if (!s) continue;
    let qty = 1;
    const wordMatch = s.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/);
    if (wordMatch) qty = quantityWords[wordMatch[1]] || 1;
    const numMatch = s.match(/(\d+)/);
    if (numMatch && !wordMatch) qty = parseInt(numMatch[1], 10);
    let bestProduct: Recipe | null = null;
    let bestScore = 0;
    for (const p of recipes) {
      const pname = p.name.toLowerCase();
      const words = pname.split(/\s+/);
      let score = 0;
      for (const w of words) { if (w.length > 2 && s.includes(w)) score += w.length; }
      if (s.includes(pname)) score += 100;
      const aliases: Record<string, string[]> = { 'oat-raisin': ['oat', 'raisin', 'oatmeal'], 'choc-chip': ['chocolate', 'choc', 'chip'], 'dark-choc': ['dark', 'dark chocolate'], 'jam-tarts': ['jam', 'tart'], 'oatmeal-pies': ['oatmeal', 'pie'] };
      if (aliases[p.id]) { for (const a of aliases[p.id]) { if (s.includes(a)) score += 20; } }
      if (score > bestScore) { bestScore = score; bestProduct = p; }
    }
    if (bestProduct && bestScore >= 3) {
      const existing = items.find(i => i.productId === bestProduct!.id);
      if (existing) { existing.quantity += qty; }
      else { items.push({ productId: bestProduct.id, quantity: qty, unitPrice: bestProduct.retailPriceDozen, costSnapshot: 0 }); }
    }
  }
  if (!items.length) { items.push({ productId: recipes[0]?.id || '', quantity: 1, unitPrice: recipes[0]?.retailPriceDozen || 0, costSnapshot: 0 }); }
  return { customerName, items, dueDate, notes: cleaned };
}

function Button({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'ghost' | 'danger' }) {
  return <button {...props} className={cx('inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold', variant === 'primary' && 'bg-primary text-primary-foreground hover:opacity-90', variant === 'soft' && 'bg-secondary text-secondary-foreground hover:brightness-95', variant === 'ghost' && 'text-muted-foreground hover:bg-muted hover:text-foreground', variant === 'danger' && 'bg-destructive text-destructive-foreground hover:opacity-90', className)}>{children}</button>;
}
function IconButton({ label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} {...props} className={cx('inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground', props.className)}>{children}</button>;
}
function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <section onClick={onClick} className={cx('rounded-xl border bg-card text-card-foreground shadow-sm', onClick && 'cursor-pointer', className)}>{children}</section>;
}
function Modal({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return createPortal(<div className="fixed inset-0 z-[9999] flex items-end justify-center bg-foreground/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={cx('max-h-[92dvh] w-full overflow-auto rounded-t-2xl border bg-card p-5 shadow-2xl sm:rounded-2xl', wide ? 'max-w-3xl' : 'max-w-xl')}>
      <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="display text-2xl font-semibold">{title}</h2>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div><IconButton label="Close dialog" onClick={onClose}><X size={18} /></IconButton></div>
      {children}
    </motion.div>
  </div>, document.body);
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1.5 text-sm font-medium"><span>{label}</span>{children}{hint && <span className="block text-xs font-normal text-muted-foreground">{hint}</span>}</label>;
}
function Input({ className = '', onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (props.type === 'number' && onChange) {
      let val = e.target.value;
      val = val.replace(/^0+(?=\d)/, '');
      if (val !== e.target.value) {
        e.target.value = val;
      }
      const num = val === '' || val === '.' ? val : val;
      e.target.value = num;
    }
    onChange?.(e);
  };
  return <input {...props} onChange={handleChange} className={cx('h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/65 focus:border-primary focus:ring-2 focus:ring-primary/15', className)} />;
}
function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx('h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15', className)} />;
}
function Empty({ icon: Icon = Sparkles, title, detail, action }: { icon?: typeof Sparkles; title: string; detail: string; action?: ReactNode }) {
  return <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center"><span className="mb-3 rounded-full bg-secondary p-3 text-secondary-foreground"><Icon size={22} /></span><h3 className="font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mono mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">{eyebrow}</p><h1 className="display text-3xl font-semibold tracking-tight sm:text-[2.45rem]">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{action}</div>;
}
function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const { store, update } = useStore();
  const lowStock = store.ingredients.filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock);
  useEffect(() => { if (isMobile && !store.settings.hasSeenWelcome) { setShowWelcome(true); } }, [isMobile, store.settings.hasSeenWelcome]);
  useEffect(() => { if (lowStock.length > 0 && !sessionStorage.getItem('low-stock-alerted')) { setShowLowStock(true); sessionStorage.setItem('low-stock-alerted', '1'); } }, [lowStock.length]);
  const dismissWelcome = () => { setShowWelcome(false); update({ settings: { ...store.settings, hasSeenWelcome: true } }); };
  if (isMobile) { return <><AnimatePresence>{showWelcome && <WelcomeScreen onDismiss={dismissWelcome} />}</AnimatePresence>{showLowStock && lowStock.length > 0 && <Modal title="Low stock alert" onClose={() => setShowLowStock(false)}><div className="space-y-3"><p className="text-sm text-muted-foreground">The following ingredients are below their minimum level and need restocking:</p><div className="space-y-2">{lowStock.map(i => <div key={i.id} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><Grape size={14} /></span><div><p className="text-xs font-semibold">{i.name}</p><p className="text-[10px] text-muted-foreground">{i.category}</p></div></div><div className="text-right"><p className="mono text-xs font-semibold text-destructive">{i.currentStock} {i.unit}</p><p className="text-[9px] text-muted-foreground">min {i.minimumStock}</p></div></div>)}</div><Button className="w-full" onClick={() => setShowLowStock(false)}>Got it</Button></div></Modal>}<MobileShell>{children}</MobileShell></>; }
  return <DesktopShell>{children}</DesktopShell>;
}

function Dashboard() {
  const { store, update } = useStore();
  const [revPeriod, setRevPeriod] = useState<RevenuePeriod>('month');
  const revLabel = revenuePeriodLabel(revPeriod);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const isCurrentMonth = (dateStr: string) => { const d = new Date(dateStr); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; };
  // Stock & production always use the real month's orders — never filtered by revenue settings
  const monthOrders = store.orders.filter(o => isCurrentMonth(o.orderDate) && !(o.archived && o.paymentStatus !== 'Paid'));
  // Revenue metrics honour the selected period and skip disconnected receipts
  const revOrders = revenueOrders(store.orders, revPeriod);
  const revExpenses = store.expenses.filter(e => inRevenuePeriod(e.date, revPeriod));
  const revenue = revOrders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0) - o.discount, 0);
  const received = revOrders.reduce((s, o) => s + o.amountPaid, 0);
  const expenses = revExpenses.reduce((s, e) => s + e.amount, 0);
  const low = store.ingredients.filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock);
  const outstanding = roundCurrency(revenue - received);
  const costs = revOrders.reduce((s, o) => s + calculateOrderCost(o.items), 0);
  const pendingOrders = monthOrders.filter(o => o.paymentStatus !== 'Paid');
  const pendingUsage = ingredientUsageForOrders(pendingOrders, store.recipes, store.ingredients);
  const stockProjection = projectedStock(store.ingredients, pendingUsage);
  const dough = doughLeftover(monthOrders, store.recipes);
  const criticalStock = stockProjection.filter(s => s.used > 0 && s.remaining <= s.ingredient.minimumStock);
  const totalStockValue = roundCurrency(store.ingredients.reduce((s, i) => s + (unitCost(i) || 0) * i.currentStock, 0));
  const projectedStockValue = roundCurrency(stockProjection.reduce((s, i) => s + (unitCost(i.ingredient) || 0) * i.remaining, 0));
  const attentionOrders = revOrders.filter(o => o.paymentStatus?.toLowerCase() !== 'paid').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-SZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const bibleVerses = [
    { text: 'Whatever you do, work at it with all your heart, as working for the Lord.', ref: 'Colossians 3:23' },
    { text: 'The LORD will open the heavens, the storehouse of his bounty, to send rain on your land in season and to bless all the work of your hands.', ref: 'Deuteronomy 28:12' },
    { text: 'Commit to the LORD whatever you do, and he will establish your plans.', ref: 'Proverbs 16:3' },
    { text: 'She considers a field and buys it; out of her earnings she plants a vineyard. She sets about her work vigorously; her arms are strong for her tasks.', ref: 'Proverbs 31:16-17' },
    { text: 'Do you see someone skilled in their work? They will serve before kings; they will not serve before officials of low rank.', ref: 'Proverbs 22:29' },
    { text: 'Eat your bread with joy, and drink your wine with a merry heart.', ref: 'Ecclesiastes 9:7' },
    { text: 'The laborer deserves his wages.', ref: 'Luke 10:7' },
    { text: 'And my God will meet all your needs according to the riches of his glory in Christ Jesus.', ref: 'Philippians 4:19' },
    { text: 'Give, and it will be given to you. A good measure, pressed down, shaken together and running over.', ref: 'Luke 6:38' },
    { text: 'The hand of the diligent will rule, but the lazy man will be forced to labor.', ref: 'Proverbs 12:24' },
    { text: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.', ref: 'Galatians 6:9' },
    { text: 'For we are God\'s handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.', ref: 'Ephesians 2:10' },
    { text: 'Whatever you do, whether in word or deed, do it all in the name of the Lord Jesus.', ref: 'Colossians 3:17' },
    { text: 'The blessing of the LORD brings wealth, without painful toil for it.', ref: 'Proverbs 10:22' },
    { text: 'She gets up while it is still night; she provides food for her family.', ref: 'Proverbs 31:15' },
    { text: 'Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this," says the LORD Almighty, "and see if I will not throw open the floodgates of heaven."', ref: 'Malachi 3:10' },
    { text: 'May the favor of the Lord our God rest on us; establish the work of our hands for us.', ref: 'Psalm 90:17' },
    { text: 'Start children off on the way they should go, and even when they are old they will not turn from it.', ref: 'Proverbs 22:6' },
    { text: 'The rich rule over the poor, and the borrower is slave to the lender.', ref: 'Proverbs 22:7' },
    { text: 'Honor the LORD with your wealth, with the firstfruits of all your crops; then your barns will be filled to overflowing.', ref: 'Proverbs 3:9-10' },
  ];
  const verseIndex = now.getDate() % bibleVerses.length;
  const verse = bibleVerses[verseIndex];
  return <div className="stagger">
    <PageHeader eyebrow={dateStr} title={`${greeting}, baker.`} description="Your quiet view of what needs care today." action={<div className="flex items-center gap-2"><button onClick={() => update({ settings: { ...store.settings, theme: store.settings.theme === 'dark' ? 'light' : 'dark' } })} className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-all duration-200 hover:bg-muted active:scale-95">{store.settings.theme === 'dark' ? '☀️' : '🌙'}</button><Link href="/orders?new=1" data-testid="link-quick-new-order"><Button><Plus size={17} /> New order</Button></Link></div>} />
    <Card className="relative mb-5 h-[124px] overflow-hidden border-0 bg-sidebar text-sidebar-foreground"><img src="/little-bliss-cover.png" alt="Little Bliss Bakery treats on a wooden counter" className="absolute inset-0 h-full w-full object-cover object-center opacity-55" /><div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/80 to-transparent" /><div className="relative flex h-full max-w-md flex-col justify-center px-6"><p className="mono text-[10px] uppercase tracking-[.22em] text-secondary">Little Bliss Bakery</p><p className="display mt-1 text-2xl font-semibold">A taste of pure bliss.</p><p className="mt-1 text-xs text-sidebar-foreground/70">Your shelves, orders, and numbers — in one calm view.</p></div></Card>
    <Card className="mb-5 overflow-hidden border-primary/15 bg-gradient-to-br from-primary/5 via-background to-accent/10"><div className="flex items-start gap-4 p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen size={18} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-relaxed text-foreground italic">"{verse.text}"</p><p className="mt-2 text-xs font-semibold text-primary">— {verse.ref}</p><p className="mt-1 text-[10px] text-muted-foreground">Verse of the day for the baker's heart</p></div></div></Card>
    <div className="mb-4 flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 w-fit">
      {REVENUE_PERIODS.map(p => (
        <button key={p.value} onClick={() => setRevPeriod(p.value)} className={cx('rounded-md px-3 py-1.5 text-xs font-semibold transition-colors', revPeriod === p.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{p.label}</button>
      ))}
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Revenue" value={money(revenue)} trend={revOrders.length ? `${revOrders.length} order${revOrders.length !== 1 ? 's' : ''}` : 'No orders yet'} icon={TrendingUp} tone="primary" note={revLabel} />
      <Metric label="Received" value={money(received)} trend={outstanding ? `${money(outstanding)} due` : 'All settled'} icon={Banknote} tone="lime" note="customer payments" />
      <Metric label="Expenses" value={money(expenses)} trend={revLabel} icon={ArrowDownRight} tone="peach" note="recorded costs" />
      <Metric label="Expected profit" value={money(revenue - costs - expenses)} trend={revenue ? `${Math.round(((revenue - costs - expenses) / revenue) * 100)}% margin` : '—'} icon={Sparkles} tone="dark" note="after estimated costs" />
    </div>
    <Card className="mt-5 overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Production Status</h2><p className="mt-0.5 text-xs text-muted-foreground">Today's production requirements and status</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{pendingOrders.length} pending</span></div><div className="p-5"><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Units to produce</p><p className="mono mt-2 text-2xl font-semibold">{pendingOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + unitsFor(i.quantity), 0), 0)}</p><p className="text-[10px] text-muted-foreground">across {pendingOrders.length} orders</p></div><div><p className="text-xs text-muted-foreground">Recipes needed</p><p className="mono mt-2 text-2xl font-semibold">{new Set(pendingOrders.flatMap(o => o.items.map(i => i.productId))).size}</p><p className="text-[10px] text-muted-foreground">different products</p></div><div><p className="text-xs text-muted-foreground">Estimated batches</p><p className="mono mt-2 text-2xl font-semibold">{dough.reduce((sum, d) => sum + Math.ceil(d.doughUsed / d.recipe.batchYield), 0)}</p><p className="text-[10px] text-muted-foreground">total batches</p></div></div>{criticalStock.length > 0 && <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3"><p className="text-xs font-semibold text-destructive">Critical ingredients</p><p className="text-[10px] text-muted-foreground mt-0.5">{criticalStock.length} ingredient{criticalStock.length !== 1 ? 's' : ''} will run low after production</p></div>}</div></Card>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Orders needing attention</h2><p className="mt-0.5 text-xs text-muted-foreground">Unpaid or overdue orders to process.</p></div><Link href="/orders" className="text-xs font-semibold text-primary hover:underline">View all <ChevronRight className="inline" size={14} /></Link></div><div className="grid grid-cols-2 divide-x border-b"><div className="p-5"><p className="text-xs text-muted-foreground">Unpaid orders</p><p className="mono mt-2 text-3xl font-semibold">{attentionOrders.length.toString().padStart(2, '0')}</p><p className="mt-1 text-xs text-muted-foreground">need payment follow-up</p></div><div className="p-5"><p className="text-xs text-muted-foreground">Outstanding</p><p className="mono mt-2 text-3xl font-semibold text-primary">{money(outstanding)}</p><p className="mt-1 text-xs text-muted-foreground">across {attentionOrders.length} order{attentionOrders.length !== 1 ? 's' : ''}</p></div></div><div className="divide-y">{attentionOrders.length ? attentionOrders.slice(0, 4).map(o => <OrderRow key={o.id} order={o} store={store} />) : <div className="p-5 text-center"><Empty icon={Check} title="All orders settled" detail="No unpaid orders — great work!" /></div>}</div></Card>
      <Card><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Attention shelf</h2><p className="mt-0.5 text-xs text-muted-foreground">Small things worth noticing.</p></div><span className="rounded-full bg-accent/35 px-2 py-1 text-xs font-semibold">{low.length} low</span></div><div className="p-5">{low.length ? <div className="space-y-4">{low.slice(0, 5).map(i => { const ratio = i.minimumStock > 0 ? i.currentStock / i.minimumStock : 1; const isCritical = ratio <= 0.5; const isLow = ratio <= 1; return <div key={i.id} className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={cx('rounded-lg p-2', isCritical ? 'bg-destructive/15 text-destructive' : isLow ? 'bg-yellow-100 text-yellow-700' : 'bg-primary/10 text-primary')}><Grape size={16} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{i.name}</p><div className="flex items-center gap-2 mt-0.5"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><div className={cx('h-full rounded-full transition-all duration-500', isCritical ? 'bg-destructive' : isLow ? 'bg-yellow-500' : 'bg-primary')} style={{ width: `${Math.min(100, (i.currentStock / (i.minimumStock * 2)) * 100)}%` }} /></div><p className="text-[10px] text-muted-foreground">{i.currentStock.toLocaleString()} {i.unit}</p></div></div></div><span className={cx('text-xs font-medium', isCritical ? 'text-destructive' : isLow ? 'text-yellow-600' : 'text-primary')}>min {i.minimumStock}</span></div>; })}</div> : <Empty icon={Check} title="Stock looks steady" detail="No ingredients are below their minimum level." />}<Link href="/inventory" className="mt-5 flex items-center justify-center gap-1 rounded-lg border py-2.5 text-xs font-semibold text-primary hover:bg-muted">View full inventory <ChevronRight size={14} /></Link></div></Card>
    </div>
    {pendingOrders.length > 0 && <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Stock after pending orders</h2><p className="mt-0.5 text-xs text-muted-foreground">{pendingOrders.length} unpaid order{pendingOrders.length !== 1 ? 's' : ''} will use these ingredients</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{money(totalStockValue - projectedStockValue)} value at risk</span></div><div className="p-5">{criticalStock.length ? <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3"><p className="text-xs font-semibold text-destructive">Stock warnings</p><p className="text-[10px] text-muted-foreground mt-0.5">{criticalStock.length} ingredient{criticalStock.length !== 1 ? 's' : ''} will run low after pending orders</p></div> : null}<div className="space-y-3">{stockProjection.filter(s => s.used > 0).sort((a, b) => (a.remaining / (a.ingredient.minimumStock || 1)) - (b.remaining / (b.ingredient.minimumStock || 1))).map(({ ingredient: i, current, used, remaining }) => { const pct = current > 0 ? remaining / current : 0; const isLow = i.minimumStock > 0 && remaining <= i.minimumStock; const isCritical = i.minimumStock > 0 && remaining <= i.minimumStock * 0.5; return <div key={i.id}><div className="flex items-center justify-between mb-1"><span className="text-sm font-medium">{i.name}</span><span className={cx('mono text-xs font-semibold', isCritical ? 'text-destructive' : isLow ? 'text-yellow-600' : 'text-primary')}>{remaining.toLocaleString()} {i.unit} left</span></div><div className="flex items-center gap-2"><div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cx('h-full rounded-full transition-all duration-500', isCritical ? 'bg-destructive' : isLow ? 'bg-yellow-500' : 'bg-primary')} style={{ width: `${Math.max(2, pct * 100)}%` }} /></div><span className="text-[10px] text-muted-foreground w-16 text-right">-{used.toLocaleString()} {i.unit}</span></div></div>; })}{!stockProjection.some(s => s.used > 0) && <p className="text-xs text-muted-foreground text-center py-4">No ingredient usage from pending orders</p>}</div></div></Card>
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Dough forecast</h2><p className="mt-0.5 text-xs text-muted-foreground">How much product your pending orders need</p></div></div><div className="p-5"><div className="space-y-3">{dough.map(({ recipe, doughMade, doughUsed, leftover }) => <div key={recipe.id} className="rounded-lg border p-3"><div className="flex items-center justify-between mb-2"><p className="text-sm font-semibold">{recipe.name}</p><span className="text-[10px] text-muted-foreground">{doughUsed} units ordered</span></div><div className="grid grid-cols-3 gap-2 text-center"><div><p className="mono text-sm font-semibold">{doughMade > 0 ? `${doughMade}g` : '—'}</p><p className="text-[10px] text-muted-foreground">Dough needed</p></div><div><p className="mono text-sm font-semibold">{recipe.batchYield}</p><p className="text-[10px] text-muted-foreground">Per batch</p></div><div><p className="mono text-sm font-semibold text-primary">{Math.ceil(doughUsed / recipe.batchYield)}</p><p className="text-[10px] text-muted-foreground">Batches to bake</p></div></div></div>)}{!dough.length && <Empty icon={Box} title="No pending product" detail="Pending orders will show dough requirements here." />}</div></div></Card>
    </div>}
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_1fr]"><Card className="p-5"><div className="mb-5 flex items-center gap-3"><span className="rounded-lg bg-secondary p-2"><Wallet size={17} /></span><div><h2 className="font-semibold">Cash pulse</h2><p className="text-xs text-muted-foreground">Received vs recorded outflow</p></div></div><div className="flex items-end gap-4"><p className="mono text-3xl font-semibold">{money(received - expenses)}</p><span className={cx('mb-1 text-xs font-semibold', received >= expenses ? 'text-primary' : 'text-destructive')}>{received >= expenses ? 'positive' : 'watch this'}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, received ? expenses / received * 100 : 0)}%` }} /></div><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>expenses {money(expenses)}</span><span>received {money(received)}</span></div></Card><Card className="p-5"><div className="mb-4 flex items-center gap-3"><span className="rounded-lg bg-accent/35 p-2"><CalendarDays size={17} /></span><div><h2 className="font-semibold">Quick actions</h2><p className="text-xs text-muted-foreground">Keep the desk moving.</p></div></div><div className="grid grid-cols-2 gap-2"><Quick href="/orders?new=1" icon={Receipt} label="Record order" /><Quick href="/expenses?new=1" icon={Wallet} label="Add expense" /><Quick href="/inventory?new=1" icon={Box} label="Adjust stock" /><Quick href="/reports" icon={BarChart3} label="See reports" /></div></Card><Card className="p-5"><div className="mb-4 flex items-center gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><TrendingUp size={17} /></span><div><h2 className="font-semibold">Top bake</h2><p className="text-xs text-muted-foreground">By sales value this month</p></div></div>{store.recipes.slice(0, 3).map((p, i) => <div key={p.id} className="mb-3 flex items-center gap-3 last:mb-0"><span className="mono w-4 text-xs text-muted-foreground">0{i + 1}</span><div className="min-w-0 flex-1"><div className="flex justify-between text-sm"><span className="truncate font-medium">{p.name}</span><span className="mono ml-2 text-xs">{money(p.retailPriceDozen)}</span></div><div className="mt-1.5 h-1 rounded-full bg-muted"><div className="h-full rounded-full bg-secondary" style={{ width: `${100 - i * 18}%` }} /></div></div></div>)}</Card></div>
  </div>;
}
function Metric({ label, value, trend, note, icon: Icon, tone }: { label: string; value: string; trend: string; note: string; icon: typeof TrendingUp; tone: string }) {
  const bg = tone === 'primary' ? 'bg-primary text-primary-foreground' : tone === 'lime' ? 'bg-secondary text-secondary-foreground' : tone === 'peach' ? 'bg-accent/45' : 'bg-sidebar text-sidebar-foreground';
  return <Card className={cx('relative overflow-hidden border-0 p-5', bg)}><div className="flex items-start justify-between"><div><p className="text-xs opacity-70">{label}</p><p className="mono mt-3 text-[1.7rem] font-semibold tracking-tight">{value}</p></div><Icon size={20} className="opacity-70" /></div><div className="mt-4 flex items-center justify-between text-xs"><span className="font-semibold">{trend}</span><span className="opacity-65">{note}</span></div></Card>;
}
function Quick({ href, icon: Icon, label }: { href: string; icon: typeof Receipt; label: string }) { return <Link href={href} className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold hover:border-primary hover:bg-primary/5"><Icon size={15} className="text-primary" />{label}</Link>; }
function OrderRow({ order, store }: { order: Order; store: Store }) {
  const total = calculateOrderTotal(order.items, order.discount, order.deliveryFee, order.taxRate || 0);
  return <div className="flex items-center justify-between gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{order.customerName.split(' ').map(x => x[0]).join('').slice(0, 2)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{order.customerName}</p><p className="text-xs text-muted-foreground">{order.invoiceNumber} · {order.items.map(i => `${i.quantity} × ${store.recipes.find(p => p.id === i.productId)?.name}`).join(', ')}</p></div></div><div className="text-right"><p className="mono text-sm font-semibold">{money(total)}</p><Status status={order.paymentStatus} /></div></div>;
}
function Status({ status }: { status: string }) { return <span className={cx('mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold', status === 'Paid' ? 'bg-secondary text-secondary-foreground' : status === 'Part paid' || status === 'Partially Paid' ? 'bg-accent/50 text-foreground' : 'bg-muted text-muted-foreground')}>{status}</span>; }
function PriorityBadge({ priority }: { priority?: 'Normal' | 'Rush' | 'Urgent' }) {
  if (!priority || priority === 'Normal') return null;
  const colors = {
    Rush: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Urgent: 'bg-red-100 text-red-800 border-red-200',
  };
  return <span className={cx('inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold', colors[priority])}>{priority}</span>;
}
const HOLD_LABEL: Record<ReservationStatus, string> = { reserved: 'Reserved', issued: 'Baked', released: 'Released', wasted: 'Wasted' };
function HoldBadge({ reservation }: { reservation?: MaterialReservation }) {
  if (!reservation) return null;
  const styles: Record<ReservationStatus, string> = {
    reserved: 'bg-blue-100 text-blue-900 border-blue-200',
    issued: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    released: 'bg-muted text-muted-foreground border-border',
    wasted: 'bg-destructive/15 text-destructive border-destructive/30',
  };
  const Icon = reservation.status === 'issued' ? Flame : reservation.status === 'reserved' ? Lock : CircleAlert;
  return <span title={reservation.lines.length > 0 ? `${reservation.lines.length} ingredients held against this order` : undefined} className={cx('mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold', styles[reservation.status])}><Icon size={9} />{HOLD_LABEL[reservation.status]}</span>;
}
const timeAgo = (ts: string) => { const diff = Date.now() - new Date(ts).getTime(); const mins = Math.floor(diff / 60000); if (mins < 1) return 'Just now'; if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; return `${Math.floor(hrs / 24)}d ago`; };

/* ─── MOBILE WELCOME SCREEN ─── */
function WelcomeScreen({ onDismiss }: { onDismiss: () => void }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000] flex flex-col bg-sidebar text-sidebar-foreground">
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }} className="mb-6">
        <img src="/little-bliss-logo.jpg" alt="Little Bliss Bakery" className="h-20 w-20 rounded-full object-cover ring-4 ring-secondary/40 mx-auto" />
      </motion.div>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="mono text-[10px] uppercase tracking-[.22em] text-secondary mb-2">Welcome to</motion.p>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="display text-3xl font-semibold mb-2">Little Bliss</motion.h1>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="text-sm text-sidebar-foreground/70 max-w-xs">Your bakery desk — orders, recipes, ingredients, and inventory, all in your pocket.</motion.p>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 flex flex-col items-center gap-3">
        <p className="text-xs text-sidebar-foreground/50">Quick access to everything:</p>
        <div className="grid grid-cols-3 gap-3 max-w-xs">
          {[{ icon: Receipt, label: 'Orders' }, { icon: BookOpen, label: 'Recipes' }, { icon: Grape, label: 'Ingredients' }, { icon: Box, label: 'Inventory' }, { icon: Wallet, label: 'Expenses' }, { icon: BarChart3, label: 'Reports' }].map(({ icon: Icon, label }) => <div key={label} className="flex flex-col items-center gap-1.5 rounded-lg bg-sidebar-accent p-3"><Icon size={18} className="text-secondary" /><span className="text-[10px] font-medium">{label}</span></div>)}
        </div>
      </motion.div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }} className="mt-10">
        <Button onClick={onDismiss} className="px-8">Get started</Button>
      </motion.div>
    </div>
    <div className="pb-8 text-center"><p className="text-[10px] text-sidebar-foreground/40">Little Bliss · v1.0</p></div>
  </motion.div>;
}

/* ─── MOBILE BOTTOM NAV ─── */
const mobileNav = [{ href: '/', label: 'Home', icon: Home }, { href: '/orders', label: 'Orders', icon: Receipt }, { href: '/recipes', label: 'Recipes', icon: BookOpen }, { href: '/ingredients', label: 'Ingredients', icon: Grape }, { href: '/more', label: 'More', icon: MoreHorizontal }];
function MobileTabBar({ location }: { location: string }) {
  const { store } = useStore(); const notifCount = unreadCount(store.notifications);
  return <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md">
    <div className="mx-auto flex max-w-lg items-center justify-around py-1.5">
      {mobileNav.map(({ href, label, icon: Icon }) => { const active = href === '/' ? location === '/' : location.startsWith(href); const showBadge = label === 'More' && notifCount > 0; return <Link key={href} href={href} className={cx('flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground')}><div className="relative"><Icon size={20} strokeWidth={active ? 2.2 : 1.6} />{showBadge && <span className="absolute -right-1.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">{notifCount > 9 ? '9+' : notifCount}</span>}</div><span>{label}</span></Link>; })}
    </div>
  </nav>;
}
function MobileFooter() { const { store } = useStore(); return <footer className="border-t bg-card/60 px-4 py-4 text-center"><p className="text-[10px] text-muted-foreground">{store.settings.bakeryName} · v1.0 · Saved on this device</p></footer>; }
function MobileShell({ children }: { children: ReactNode }) { const [location] = useLocation(); return <div className="min-h-[100dvh] bg-background pb-20"><main className="page-enter mx-auto max-w-lg p-4">{children}</main><MobileFooter /><MobileTabBar location={location} /></div>; }

/* ─── DESKTOP SHELL (original sidebar layout) ─── */
function DesktopShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const nav = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/orders', label: 'Orders', icon: Receipt },
    { href: '/recipes', label: 'Recipes', icon: BookOpen },
    { href: '/ingredients', label: 'Ingredients', icon: Grape },
    { href: '/inventory', label: 'Inventory', icon: Box },
    { href: '/expenses', label: 'Expenses', icon: Wallet },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/budget', label: 'Budget', icon: CircleDollarSign },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/customer-analytics', label: 'Customer Analytics', icon: TrendingUp },
    { href: '/sales-analytics', label: 'Sales Analytics', icon: BarChart3 },
    { href: '/production-calendar', label: 'Production Calendar', icon: CalendarDays },
    { href: '/purchase-orders', label: 'Purchase Orders', icon: Package },
    { href: '/profit-margin', label: 'Profit Margin', icon: CircleDollarSign },
    { href: '/financial-reports', label: 'Financial Reports', icon: FileText },
    { href: '/expiration-tracking', label: 'Expiration Tracking', icon: Clock },
    { href: '/delivery-routes', label: 'Delivery Routes', icon: MapIcon },
    { href: '/whatsapp-integration', label: 'WhatsApp', icon: Bell },
    { href: '/staff-tasks', label: 'Staff Tasks', icon: ClipboardList },
    { href: '/backup-restore', label: 'Backup & Restore', icon: Archive },
  ];
  const { store } = useStore();
  return <div className="min-h-[100dvh] bg-background">
    <aside className={cx('fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5"><img src="/little-bliss-logo.jpg" alt="Little Bliss Bakery logo" className="h-11 w-11 rounded-full object-cover ring-2 ring-secondary/60" /><div><p className="display text-lg leading-tight">Little Bliss</p><p className="text-[10px] uppercase tracking-[.22em] text-sidebar-foreground/60">Bakery desk</p></div><IconButton label="Close menu" className="ml-auto text-sidebar-foreground lg:hidden" onClick={() => setOpen(false)}><X size={17} /></IconButton></div>
      <div className="px-4 pb-3 pt-5"><div className="rounded-lg bg-sidebar-accent p-3"><p className="text-[11px] text-sidebar-foreground/60">Good morning, baker</p><p className="mt-1 text-sm font-semibold">{new Date().toLocaleDateString('en-SZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p><div className="mt-3 flex items-center gap-2 text-xs text-secondary"><span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Saved on this device</div></div></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} onClick={() => setOpen(false)} className={cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium', location === href ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-foreground')}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{href === '/ingredients' && store.ingredients.some(i => i.purchasePrice === 0) && <span className="ml-auto h-2 w-2 rounded-full bg-accent" />}</Link>)}</nav>
      <div className="border-t border-sidebar-border p-3"><Link href="/settings" data-testid="link-nav-settings" onClick={() => setOpen(false)} className={cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium', location === '/settings' ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-foreground')}><SettingsIcon size={17} /><span>Settings</span></Link><p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-wider text-sidebar-foreground/40">Little Bliss · v1.0</p></div>
    </aside>
    <div className="lg:pl-[248px]"><header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b bg-background/90 px-4 backdrop-blur-md sm:px-7"><div className="flex items-center gap-3"><IconButton label="Open menu" className="lg:hidden" onClick={() => setOpen(true)}><Menu size={20} /></IconButton><div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><span>Little Bliss Bakery</span><ChevronRight size={14} /><span className="font-semibold text-foreground">{location === '/' ? 'Overview' : location.slice(1).replace('-', ' ')}</span></div></div><div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full bg-secondary/60 px-3 py-1.5 text-xs font-medium text-secondary-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Local data</span><Link href="/settings" data-testid="link-header-settings" className="rounded-full border p-2 text-muted-foreground hover:bg-muted"><SettingsIcon size={17} /></Link></div></header><main className="page-enter mx-auto max-w-[1480px] p-4 sm:p-7">{children}</main></div>
  </div>;
}

/* ─── MOBILE MORE MENU ─── */
function MoreMenu() {
  const { store, update } = useStore(); const [location] = useLocation(); const notifCount = unreadCount(store.notifications); const lowStock = store.ingredients.filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock);
  const items = [{ href: '/recipes', label: 'Recipes', icon: BookOpen, detail: `${store.recipes.length}` }, { href: '/inventory', label: 'Inventory', icon: Box, detail: `${lowStock.length} low` }, { href: '/expenses', label: 'Expenses', icon: Wallet, detail: `${store.expenses.length}` }, { href: '/reports', label: 'Reports', icon: BarChart3, detail: 'Profit' }, { href: '/budget', label: 'Budget', icon: CircleDollarSign, detail: 'Allocations' }, { href: '/clients', label: 'Clients', icon: Users, detail: `${store.clients.length}` }, { href: '/customer-analytics', label: 'Analytics', icon: TrendingUp, detail: 'Customer data' }, { href: '/audit', label: 'Activity', icon: History, detail: notifCount > 0 ? `${notifCount} new` : 'Log' }, { href: '/settings', label: 'Settings', icon: SettingsIcon, detail: 'Config' }];
  return <div><div className="flex items-center justify-between mb-4"><h1 className="display text-xl font-semibold">More</h1><button onClick={() => update({ settings: { ...store.settings, theme: store.settings.theme === 'dark' ? 'light' : 'dark' } })} className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-muted active:scale-95">{store.settings.theme === 'dark' ? <span className="text-sm">☀️</span> : <span className="text-sm">🌙</span>}</button></div><div className="grid grid-cols-3 gap-2.5">{items.map(({ href, label, icon: Icon, detail }) => { const active = location === href; return <Link key={href} href={href} className={cx('group flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 active:scale-95', active ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5')}><span className={cx('flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-200', active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground group-hover:bg-primary/15 group-hover:text-primary')}><Icon size={18} strokeWidth={active ? 2.2 : 1.6} /></span><div><p className="text-xs font-semibold leading-tight">{label}</p><p className="text-[9px] text-muted-foreground mt-0.5">{detail}</p></div></Link>; })}</div></div>;
}

/* ─── MOBILE AUDIT LOG ─── */
function AuditLog() {
  const { store, update } = useStore(); const [filter, setFilter] = useState('All');
  const sections = ['All', ...new Set(store.auditLog.map(e => e.section))]; const filtered = filter === 'All' ? store.auditLog : store.auditLog.filter(e => e.section === filter);
  const markAllRead = () => { update({ notifications: store.notifications.map(n => ({ ...n, read: true })) }); };
  return <div>
    <div className="mb-4 flex items-center justify-between"><h1 className="display text-xl font-semibold">Activity</h1><Button variant="ghost" onClick={markAllRead} className="text-xs">Mark all read</Button></div>
    {store.notifications.length > 0 && <Card className="mb-4 overflow-hidden"><div className="border-b px-4 py-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Notifications</h2><span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">{unreadCount(store.notifications)} new</span></div><div className="divide-y max-h-48 overflow-y-auto">{store.notifications.slice(0, 10).map(n => <div key={n.id} className={cx('px-4 py-3', !n.read && 'bg-primary/5')}><div className="flex items-center justify-between mb-0.5"><p className="text-xs font-semibold">{n.title}</p><span className="text-[10px] text-muted-foreground">{timeAgo(n.timestamp)}</span></div><p className="text-[10px] text-muted-foreground">{n.body}</p></div>)}</div></Card>}
    <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">{sections.map(s => <button key={s} onClick={() => setFilter(s)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold', filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{s}</button>)}</div>
    <div className="space-y-2">{filtered.map(entry => <Card key={entry.id} className="p-3"><div className="flex items-start justify-between mb-1"><div className="flex items-center gap-2"><span className={cx('flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold', entry.action === 'created' ? 'bg-secondary text-secondary-foreground' : entry.action === 'updated' ? 'bg-accent/40 text-foreground' : 'bg-destructive/15 text-destructive')}>{entry.action === 'created' ? '+' : entry.action === 'updated' ? <Edit3 size={10} /> : '−'}</span><div><p className="text-xs font-semibold">{entry.entityName}</p><p className="text-[10px] text-muted-foreground">{entry.section} · {entry.action}</p></div></div><span className="text-[10px] text-muted-foreground">{timeAgo(entry.timestamp)}</span></div><p className="text-[10px] text-muted-foreground ml-8">{entry.details}</p></Card>)}
      {!filtered.length && <Empty icon={History} title="No activity yet" detail="Changes will appear here as you use the app." />}
    </div>
    <div className="mt-5"><Card className="overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Baking Standards Reference</h2><p className="mt-0.5 text-xs text-muted-foreground">Quick reference for the kitchen — batch yields, oven temps, and bake times.</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{store.recipes.length} recipes</span></div><div className="p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{store.recipes.filter(p => p.active).map(p => { return <div key={p.id} className="rounded-lg border p-4"><div className="mb-3 flex items-start justify-between"><p className="font-semibold text-sm">{p.name}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{p.category}</span></div><div className="space-y-2 text-xs"><div className="flex items-center justify-between"><span className="text-muted-foreground">1 Recipe =</span><span className="font-semibold">1 Batch</span></div><div className="flex items-center justify-between"><span className="text-muted-foreground">1 Batch =</span><span className="font-semibold">{p.batchYield} units</span></div><div className="flex items-center justify-between"><span className="text-muted-foreground">1 Dozen =</span><span className="font-semibold">12 units</span></div><div className="border-t pt-2 mt-2"><div className="flex items-center justify-between"><span className="text-muted-foreground">Oven Temp</span><span className="font-semibold">{p.ovenTemp || '170-180°C'}</span></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Bake Time</span><span className="font-semibold">{p.bakeTimeMinutes || 14} min per tray</span></div></div></div></div>; })}</div></div></Card></div>
  </div>;
}

/* ─── DESKTOP AUDIT LOG ─── */
function DesktopAuditLog() {
  const { store, update } = useStore(); const [filter, setFilter] = useState('All');
  const sections = ['All', ...new Set(store.auditLog.map(e => e.section))]; const filtered = filter === 'All' ? store.auditLog : store.auditLog.filter(e => e.section === filter);
  const markAllRead = () => { update({ notifications: store.notifications.map(n => ({ ...n, read: true })) }); };
  return <div>
    <PageHeader eyebrow="History" title="Audit Log" description="Every change, tracked with time and context." />
    <div className="mb-4 flex items-center gap-3"><div className="flex gap-1.5 overflow-x-auto">{sections.map(s => <button key={s} onClick={() => setFilter(s)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold', filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted')}>{s}</button>)}</div><Button variant="ghost" onClick={markAllRead} className="text-xs ml-auto">Mark all read</Button></div>
    {store.notifications.length > 0 && <Card className="mb-5 overflow-hidden"><div className="border-b px-5 py-4 flex items-center justify-between"><div><h2 className="font-semibold">Notifications</h2><p className="text-xs text-muted-foreground">{unreadCount(store.notifications)} unread</p></div></div><div className="divide-y max-h-64 overflow-y-auto">{store.notifications.slice(0, 20).map(n => <div key={n.id} className={cx('px-5 py-3', !n.read && 'bg-primary/5')}><div className="flex items-center justify-between mb-0.5"><p className="text-sm font-semibold">{n.title}</p><span className="text-xs text-muted-foreground">{timeAgo(n.timestamp)}</span></div><p className="text-xs text-muted-foreground">{n.body}</p></div>)}</div></Card>}
    <Card className="overflow-hidden">{filtered.length ? <div className="divide-y">{filtered.map(entry => <div key={entry.id} className="px-5 py-4"><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-3"><span className={cx('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold', entry.action === 'created' ? 'bg-secondary text-secondary-foreground' : entry.action === 'updated' ? 'bg-accent/40 text-foreground' : 'bg-destructive/15 text-destructive')}>{entry.action === 'created' ? '+' : entry.action === 'updated' ? <Edit3 size={14} /> : '−'}</span><div><p className="text-sm font-semibold">{entry.entityName}</p><p className="text-xs text-muted-foreground">{entry.section} · {entry.action}</p></div></div><span className="text-xs text-muted-foreground">{timeAgo(entry.timestamp)}</span></div><p className="text-xs text-muted-foreground ml-11">{entry.details}</p></div>)}</div> : <Empty icon={History} title="No activity yet" detail="Changes will appear here as you use the app." />}</Card>
  </div>;
}

function SwipeableRow({ onEdit, onDelete, children }: { onEdit: () => void; onDelete: () => void; children: React.ReactNode }) {
  const [offset, setOffset] = useState(0);
  const startRef = useRef<{ x: number; time: number } | null>(null);
  const lastTapRef = useRef(0);
  const threshold = 40;

  const onStart = (x: number) => { startRef.current = { x, time: Date.now() }; };
  const onMove = (x: number) => { if (!startRef.current) return; setOffset(Math.max(-120, Math.min(120, x - startRef.current.x))); };
  const onEnd = () => {
    if (!startRef.current) return;
    startRef.current = null;
    if (offset < -threshold) {
      setOffset(0); onDelete();
    } else if (offset > threshold) {
      setOffset(0); onEdit();
    } else {
      setOffset(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="absolute inset-0 flex">
        <div className="flex w-1/2 items-center justify-end pr-2 bg-destructive/10 rounded-l-lg">
          <span className="text-xs font-medium text-destructive flex items-center gap-1"><Trash2 size={13} /> Delete</span>
        </div>
        <div className="flex w-1/2 items-center justify-start pl-2 bg-primary/10 rounded-r-lg">
          <span className="text-xs font-medium text-primary flex items-center gap-1"><Pencil size={13} /> Edit</span>
        </div>
      </div>
      <div
        className="relative bg-card touch-pan-x"
        style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? 'transform 0.2s ease' : 'none' }}
        onTouchStart={e => onStart(e.touches[0].clientX)}
        onTouchMove={e => onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onMouseDown={e => onStart(e.clientX)}
        onMouseMove={e => { if (startRef.current) onMove(e.clientX); }}
        onMouseUp={onEnd}
        onMouseLeave={() => { if (startRef.current) onEnd(); }}
      >
        {children}
      </div>
    </div>
  );
}

function Ingredients() {
  const { store, update } = useStore(); const isMobile = useIsMobile(); const [edit, setEdit] = useState<Ingredient | null>(null); const [search, setSearch] = useState(''); const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null); const [deleteStep, setDeleteStep] = useState(0);
  const rows = store.ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const saveIngredient = (i: Ingredient) => { const exists = store.ingredients.some(x => x.id === i.id); update({ ingredients: exists ? store.ingredients.map(x => x.id === i.id ? i : x) : [...store.ingredients, i], auditLog: [createAuditEntry('Ingredients', exists ? 'updated' : 'created', i.id, i.name, `${exists ? 'Updated' : 'Created'} ingredient: ${i.name}`), ...store.auditLog], notifications: [createNotification(`Ingredient ${exists ? 'updated' : 'created'}`, `${i.name} was ${exists ? 'updated' : 'created'}`, 'Ingredients', i.id), ...store.notifications] }); setEdit(null); };
  const removeIngredient = (i: Ingredient) => { setDeletingIngredient(i); setDeleteStep(1); };
  const confirmDeleteStep1 = () => setDeleteStep(2);
  const confirmDeleteStep2 = () => { if (!deletingIngredient) return; const i = deletingIngredient; update({ ingredients: store.ingredients.filter(x => x.id !== i.id), auditLog: [createAuditEntry('Ingredients', 'deleted', i.id, i.name, `Deleted ingredient: ${i.name}`), ...store.auditLog], notifications: [createNotification('Ingredient deleted', `${i.name} was removed`, 'Ingredients', i.id), ...store.notifications] }); setDeletingIngredient(null); setDeleteStep(0); };
  const cancelDelete = () => { setDeletingIngredient(null); setDeleteStep(0); };
  if (isMobile) { return <div><div className="mb-4 flex items-center justify-between"><h1 className="display text-xl font-semibold">Ingredients</h1><Button onClick={() => setEdit({ id: id('ing'), name: '', category: 'Dry goods', supplier: '', packSize: 0, unit: 'g', purchasePrice: 0, purchaseDate: today(), notes: '', currentStock: 0, minimumStock: 0, priceHistory: [] })}><Plus size={16} /> Add</Button></div><div className="relative mb-4"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients..." className="pl-9" /></div>{store.ingredients.filter(i => !i.purchasePrice).length > 0 && <p className="mb-3 text-xs text-accent-foreground bg-accent/30 rounded-lg px-3 py-2">{store.ingredients.filter(i => !i.purchasePrice).length} ingredients still need pricing</p>}<div className="mb-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ArrowUpRight size={10} /> Swipe right to edit</span><span className="flex items-center gap-1">Swipe left to delete <ArrowDownRight size={10} /></span></div><div className="space-y-2">{rows.map(i => { const uc = unitCost(i); return <SwipeableRow key={i.id} onEdit={() => setEdit(i)} onDelete={() => removeIngredient(i)}><div className="p-4"><div className="flex items-center justify-between"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold text-sm">{i.name}</p></div><p className="text-[10px] text-muted-foreground">{i.category} · {i.supplier || 'No supplier'}</p></div><div className="text-right"><p className="mono text-sm">{i.packSize ? `${i.packSize.toLocaleString()} ${i.unit}` : 'No pack size'}</p>{uc ? <p className="text-[10px] text-muted-foreground">{money(uc)}/{i.unit}</p> : <p className="text-[10px] text-accent-foreground">Need price</p>}</div></div></div></SwipeableRow>; })}{!rows.length && <Empty icon={Grape} title="No ingredients yet" detail="Start adding ingredients to track your pantry." />}</div>{edit && <IngredientModal value={edit} onClose={() => setEdit(null)} onSave={saveIngredient} />}{deletingIngredient && <Modal title="Delete ingredient" onClose={cancelDelete}><div className="space-y-4">{deleteStep === 1 ? <><p className="text-sm">All data concerning <strong>{deletingIngredient.name}</strong> will be permanently removed:</p><ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground"><li>Stock levels and tracking</li><li>Recipe allocations</li><li>Price history</li></ul><p className="text-sm font-semibold text-destructive">This cannot be undone.</p><div className="flex justify-end gap-2"><Button variant="ghost" onClick={cancelDelete}>Cancel</Button><Button variant="danger" onClick={confirmDeleteStep1}>Continue</Button></div></> : <><p className="text-sm">Are you sure you want to delete <strong>{deletingIngredient.name}</strong>?</p><div className="flex justify-end gap-2"><Button variant="ghost" onClick={cancelDelete}>No, keep it</Button><Button variant="danger" onClick={confirmDeleteStep2}>Yes, delete</Button></div></>}</div></Modal>}</div>; }
  return <div><PageHeader eyebrow="Pantry" title="Ingredients" description="One honest place for every pack, price, and supplier." action={<Button data-testid="button-add-ingredient" onClick={() => setEdit({ id: id('ing'), name: '', category: 'Dry goods', supplier: '', packSize: 0, unit: 'g', purchasePrice: 0, purchaseDate: today(), notes: '', currentStock: 0, minimumStock: 0, priceHistory: [] })}><Plus size={17} /> Add ingredient</Button>} /><div className="mb-4 flex items-center gap-3"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-3 text-muted-foreground" size={16} /><Input data-testid="input-search-ingredients" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients..." className="pl-9" /></div><span className="text-xs text-muted-foreground">{store.ingredients.filter(i => !i.purchasePrice).length} still need pricing</span></div><Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-muted/55 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3.5">Ingredient</th><th>Pack</th><th>Purchase price</th><th>Unit cost</th><th>Supplier</th><th className="pr-5 text-right"> </th></tr></thead><tbody className="divide-y">{rows.map(i => { const uc = unitCost(i); return <tr key={i.id} className="hover:bg-muted/25"><td className="px-5 py-4"><p className="font-semibold">{i.name}</p><p className="text-xs text-muted-foreground">{i.category}</p></td><td className="mono">{i.packSize ? `${i.packSize.toLocaleString()} ${i.unit}` : 'Not set'}</td><td className={i.purchasePrice ? 'mono' : 'text-xs font-semibold text-accent-foreground'}>{i.purchasePrice ? money(i.purchasePrice) : 'Price missing'}</td><td className="mono text-muted-foreground">{uc ? `${money(uc)} / ${i.unit}` : '—'}</td><td>{i.supplier || <span className="text-xs text-muted-foreground">—</span>}</td><td className="pr-5 text-right"><IconButton label={`Edit ${i.name}`} onClick={() => setEdit(i)}><Pencil size={16} /></IconButton><IconButton label={`Delete ${i.name}`} onClick={() => removeIngredient(i)}><Trash2 size={16} /></IconButton></td></tr>; })}</tbody></table></div></Card>{edit && <IngredientModal value={edit} onClose={() => setEdit(null)} onSave={saveIngredient} />}{deletingIngredient && <Modal title="Delete ingredient" onClose={cancelDelete}><div className="space-y-4">{deleteStep === 1 ? <><p className="text-sm">All data concerning <strong>{deletingIngredient.name}</strong> will be permanently removed:</p><ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground"><li>Stock levels and tracking</li><li>Recipe allocations</li><li>Price history</li></ul><p className="text-sm font-semibold text-destructive">This cannot be undone.</p><div className="flex justify-end gap-2"><Button variant="ghost" onClick={cancelDelete}>Cancel</Button><Button variant="danger" onClick={confirmDeleteStep1}>Continue</Button></div></> : <><p className="text-sm">Are you sure you want to delete <strong>{deletingIngredient.name}</strong>?</p><div className="flex justify-end gap-2"><Button variant="ghost" onClick={cancelDelete}>No, keep it</Button><Button variant="danger" onClick={confirmDeleteStep2}>Yes, delete</Button></div></>}</div></Modal>}</div>;
}
function IngredientModal({ value, onClose, onSave }: { value: Ingredient; onClose: () => void; onSave: (v: Ingredient) => void }) {
  const [i, setI] = useState(value); const set = (k: keyof Ingredient, v: string | number) => setI(x => ({ ...x, [k]: v }));
  const autoConvertUnit = (packSize: number, currentUnit: string) => {
    if (currentUnit === 'g' && packSize >= 1000) return { packSize: packSize / 1000, unit: 'kg' };
    if (currentUnit === 'ml' && packSize >= 1000) return { packSize: packSize / 1000, unit: 'L' };
    return null;
  };
  const handlePackSizeChange = (newPackSize: number) => {
    const conversion = autoConvertUnit(newPackSize, i.unit);
    if (conversion) {
      // The unit changes, so every quantity stored in the old unit has to follow it.
      setI(x => ({ ...x, packSize: conversion.packSize, unit: conversion.unit, currentStock: x.currentStock / 1000, minimumStock: x.minimumStock / 1000 }));
    } else {
      set('packSize', newPackSize);
    }
  };
  const handleUnitChange = (newUnit: string) => {
    if (i.unit === 'g' && newUnit === 'kg') { setI(x => ({ ...x, unit: newUnit, packSize: x.packSize / 1000, currentStock: x.currentStock / 1000, minimumStock: x.minimumStock / 1000 })); }
    else if (i.unit === 'kg' && newUnit === 'g') { setI(x => ({ ...x, unit: newUnit, packSize: x.packSize * 1000, currentStock: x.currentStock * 1000, minimumStock: x.minimumStock * 1000 })); }
    else if (i.unit === 'ml' && newUnit === 'L') { setI(x => ({ ...x, unit: newUnit, packSize: x.packSize / 1000, currentStock: x.currentStock / 1000, minimumStock: x.minimumStock / 1000 })); }
    else if (i.unit === 'L' && newUnit === 'ml') { setI(x => ({ ...x, unit: newUnit, packSize: x.packSize * 1000, currentStock: x.currentStock * 1000, minimumStock: x.minimumStock * 1000 })); }
    else { set('unit', newUnit); }
  };
  return <Modal title={value.name ? 'Edit ingredient' : 'New ingredient'} subtitle="Set pricing, supplier info, and minimum stock level." onClose={onClose}><form onSubmit={e => { e.preventDefault(); onSave(i); }} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Ingredient name"><Input required value={i.name} onChange={e => set('name', e.target.value)} /></Field><Field label="Category"><Select value={i.category} onChange={e => set('category', e.target.value)}>{INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</Select></Field><Field label="Pack size" hint={i.unit === 'g' && i.packSize < 1000 ? 'Enter 1000+ to auto-convert to kg' : i.unit === 'ml' && i.packSize < 1000 ? 'Enter 1000+ to auto-convert to L' : undefined}><Input type="number" min="0" step=".01" value={i.packSize} onChange={e => handlePackSizeChange(Number(e.target.value))} /></Field><Field label="Unit"><Select value={i.unit} onChange={e => handleUnitChange(e.target.value)}><option value="g">grams (g)</option><option value="kg">kilograms (kg)</option><option value="ml">millilitres (ml)</option><option value="L">litres (L)</option><option value="each">each</option></Select></Field><Field label="Purchase price" hint={!i.purchasePrice ? 'Leave 0 until you have the receipt.' : undefined}><Input type="number" min="0" step=".01" value={i.purchasePrice} onChange={e => set('purchasePrice', Number(e.target.value))} /></Field><Field label="Supplier"><Input value={i.supplier} onChange={e => set('supplier', e.target.value)} /></Field></div><Field label="Minimum stock level" hint="Alert when stock falls below this amount"><div className="relative"><Input type="number" min="0" step=".01" value={i.minimumStock} onChange={e => set('minimumStock', Number(e.target.value))} className="pr-12" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">{i.unit}</span></div></Field><Field label="Notes"><textarea className="min-h-20 w-full rounded-lg border bg-background p-3 text-sm outline-none focus:border-primary" value={i.notes} onChange={e => set('notes', e.target.value)} /></Field><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save ingredient</Button></div></form></Modal>;
}

function Recipes() {
  const { store, update } = useStore(); const isMobile = useIsMobile(); const [selected, setSelected] = useState<Recipe | null>(null); const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null); const [deleteStep, setDeleteStep] = useState(0); const [printView, setPrintView] = useState<null | 'recipes' | 'cards'>(null);
  const [showVersionHistory, setShowVersionHistory] = useState<Recipe | null>(null);
  const save = (r: Recipe) => { 
    const exists = store.recipes.some(x => x.id === r.id);
    let updatedRecipe = r;
    
    // Create version history if updating an existing recipe
    if (exists) {
      const existingRecipe = store.recipes.find(x => x.id === r.id);
      if (existingRecipe) {
        const newVersion = (existingRecipe.version || 0) + 1;
        const versionEntry: RecipeVersion = {
          version: newVersion,
          timestamp: new Date().toISOString(),
          changedBy: 'User',
          changes: `Updated recipe ${r.name}`,
          recipe: { ...existingRecipe },
        };
        updatedRecipe = {
          ...r,
          version: newVersion,
          versionHistory: [...(existingRecipe.versionHistory || []), versionEntry],
        };
      }
    } else {
      // New recipe starts at version 1
      updatedRecipe = { ...r, version: 1, versionHistory: [] };
    }
    
    update({ 
      recipes: exists ? store.recipes.map(x => x.id === r.id ? updatedRecipe : x) : [...store.recipes, updatedRecipe], 
      auditLog: [createAuditEntry('Recipes', exists ? 'updated' : 'created', r.id, r.name, `${exists ? 'Updated' : 'Created'} recipe: ${r.name}`), ...store.auditLog], 
      notifications: [createNotification(`Recipe ${exists ? 'updated' : 'created'}`, `${r.name} was ${exists ? 'updated' : 'created'}`, 'Recipes', r.id), ...store.notifications] 
    }); 
    setSelected(null); 
  };
  const revertToVersion = (recipe: Recipe, versionEntry: RecipeVersion) => {
    const revertedRecipe = {
      ...versionEntry.recipe,
      id: recipe.id,
      version: (recipe.version || 0) + 1,
      versionHistory: [
        ...(recipe.versionHistory || []),
        {
          version: (recipe.version || 0) + 1,
          timestamp: new Date().toISOString(),
          changedBy: 'User',
          changes: `Reverted to version ${versionEntry.version}`,
          recipe: { ...recipe },
        },
      ],
    };
    update({
      recipes: store.recipes.map(x => x.id === recipe.id ? revertedRecipe : x),
      auditLog: [createAuditEntry('Recipes', 'reverted', recipe.id, recipe.name, `Reverted ${recipe.name} to version ${versionEntry.version}`), ...store.auditLog],
      notifications: [createNotification('Recipe reverted', `${recipe.name} was reverted to version ${versionEntry.version}`, 'Recipes', recipe.id), ...store.notifications],
    });
    setShowVersionHistory(null);
  };
  const removeRecipe = (r: Recipe) => { setDeletingRecipe(r); setDeleteStep(1); };
  const confirmDeleteStep1 = () => setDeleteStep(2);
  const confirmDeleteStep2 = () => { if (!deletingRecipe) return; update({ recipes: store.recipes.filter(x => x.id !== deletingRecipe.id), auditLog: [createAuditEntry('Recipes', 'deleted', deletingRecipe.id, deletingRecipe.name, `Deleted recipe: ${deletingRecipe.name}`), ...store.auditLog], notifications: [createNotification('Recipe deleted', `${deletingRecipe.name} was removed`, 'Recipes', deletingRecipe.id), ...store.notifications] }); setDeletingRecipe(null); setDeleteStep(0); };
  const cancelDelete = () => { setDeletingRecipe(null); setDeleteStep(0); };
  const newRecipe = (): Recipe => ({ id: id('recipe'), name: '', category: 'Cookies', description: '', image: '', batchYield: 24, servingSize: '1 dozen', laborCost: 0, energyCost: 0, packagingCost: 0, wastagePercent: 0, retailPriceDozen: 0, wholesalePriceDozen: 0, active: true, ovenTemp: '170-180°C', bakeTimeMinutes: 14, ingredients: [], doughWeight: 0, finishedWeight: 0, notes: '' });
  if (isMobile) { return <div><div className="mb-4 flex items-center justify-between"><h1 className="display text-xl font-semibold">Recipes</h1><span className="flex items-center gap-2"><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{store.recipes.length} recipes</span><Button variant="soft" onClick={() => setPrintView('recipes')} aria-label="Print recipe book"><FileText size={15} /></Button></span></div><div className="mb-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ArrowUpRight size={10} /> Swipe right to edit</span><span className="flex items-center gap-1">Swipe left to delete <ArrowDownRight size={10} /></span></div><div className="mb-4"><div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Baking Reference</h2><Button variant="soft" onClick={() => setPrintView('cards')}><FileText size={13} /> Print cards</Button></div><BakingReferenceCards recipes={store.recipes} ingredients={store.ingredients} /></div><div className="space-y-3">{store.recipes.map(r => { const c = costOfRecipe(r, store.ingredients); const issues = recipeCostIssues(r, store.ingredients); return <SwipeableRow key={r.id} onEdit={() => setSelected(r)} onDelete={() => removeRecipe(r)}><Card className="overflow-hidden"><div className="bg-sidebar p-4 text-sidebar-foreground"><div className="flex items-center justify-between"><p className="font-semibold text-sm">{r.name || 'Unnamed recipe'}</p><div className="flex items-center gap-2"><span className="rounded-full bg-sidebar-primary px-2 py-0.5 text-[10px] font-semibold text-sidebar-primary-foreground">yield {r.batchYield}</span>{r.version && r.version > 1 && <button onClick={() => setShowVersionHistory(r)} className="rounded-full bg-sidebar-accent px-2 py-0.5 text-[9px] font-semibold text-sidebar-foreground">v{r.version}</button>}</div></div></div><div className="p-4"><div className="mb-2 flex items-start justify-between gap-3"><span className="text-[10px] text-muted-foreground">Batch cost</span><span className="text-right"><span className="mono text-sm font-semibold">{money(c)}</span>{issues.count > 0 && <span className="mt-0.5 block text-[10px] font-medium text-destructive">{recipeIssueLabel(issues)}</span>}</span></div><p className="text-[10px] text-muted-foreground">{r.ingredients.length} ingredients</p></div></Card></SwipeableRow>; })}{!store.recipes.length && <Empty icon={BookOpen} title="No recipes yet" detail="Link ingredients to products to calculate batch costs." />}</div>{selected && <RecipeModal value={selected} ingredients={store.ingredients} onClose={() => setSelected(null)} onSave={save} />}{showVersionHistory && <RecipeVersionHistory recipe={showVersionHistory} onClose={() => setShowVersionHistory(null)} onRevert={(v) => revertToVersion(showVersionHistory, v)} />}{deletingRecipe && <Modal title="Delete recipe" onClose={cancelDelete}><div className="space-y-4"><p className="text-sm text-muted-foreground">{deleteStep === 1 ? <>Are you sure you want to delete <strong>{deletingRecipe.name}</strong>?</> : <><strong>This cannot be undone.</strong> Type <span className="font-semibold">DELETE</span> to confirm.</>}</p>{deleteStep === 2 && <Input autoFocus placeholder="Type DELETE to confirm" onChange={e => { if (e.target.value === 'DELETE') confirmDeleteStep2(); }} />}<div className="flex justify-end gap-2"><Button variant="ghost" onClick={cancelDelete}>Cancel</Button>{deleteStep === 1 && <Button variant="danger" onClick={confirmDeleteStep1}>Delete</Button>}</div></div></Modal>}{printView === 'recipes' && createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && setPrintView(null)}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Recipes</p><h2 className="display text-2xl font-semibold">Recipe Book</h2></div><div className="flex gap-2"><Button variant="ghost" onClick={() => setPrintView(null)}>Close</Button><Button onClick={() => printWithTitle("Little Bliss Bakery - Recipe Book")}><FileText size={16} /> Print or save PDF</Button></div></div><RecipesPrintDocument recipes={store.recipes} store={store} /></div></div>, document.body)}{printView === 'cards' && createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && setPrintView(null)}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Baking reference</p><h2 className="display text-2xl font-semibold">Reference Cards</h2></div><div className="flex gap-2"><Button variant="ghost" onClick={() => setPrintView(null)}>Close</Button><Button onClick={() => printWithTitle("Little Bliss Bakery - Baking Reference Cards")}><FileText size={16} /> Print or save PDF</Button></div></div><BakingReferencePrintDocument recipes={store.recipes} /></div></div>, document.body)}</div>;
  }
  return <div><PageHeader eyebrow="Bake book" title="Recipes" description="Build batches with costs that update as your pantry prices change." action={<div className="flex gap-2"><Button onClick={() => setSelected(newRecipe())}><Plus size={16} /> Add recipe</Button><Button variant="soft" onClick={() => setPrintView('recipes')}><FileText size={16} /> Print all</Button></div>} /><div className="mb-6"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Baking Reference Cards</h2><Button variant="soft" className="text-xs" onClick={() => setPrintView('cards')}><FileText size={14} /> Print cards</Button></div><BakingReferenceCards recipes={store.recipes} ingredients={store.ingredients} /></div><div className="grid gap-4 lg:grid-cols-3">{store.recipes.map(r => { const issues = recipeCostIssues(r, store.ingredients); const c = costOfRecipe(r, store.ingredients); return <Card key={r.id} className="flex flex-col overflow-hidden"><div className="flex items-start justify-between bg-sidebar p-5 text-sidebar-foreground"><div><p className="mono text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Recipe {r.id.replace('recipe-', '').toUpperCase()}</p><h2 className="display mt-2 text-xl font-semibold">{r.name}</h2></div><div className="flex items-center gap-2"><span className="rounded-full bg-sidebar-primary px-2 py-1 text-[10px] font-semibold text-sidebar-primary-foreground">yield {r.batchYield}</span>{r.version && r.version > 1 && <button onClick={() => setShowVersionHistory(r)} className="rounded-full bg-sidebar-accent px-2 py-1 text-[10px] font-semibold text-sidebar-foreground hover:bg-sidebar-primary/20">v{r.version}</button>}</div></div><div className="flex-1 p-5"><div className="mb-4 flex items-start justify-between gap-3 border-b pb-3"><span className="text-xs text-muted-foreground">Estimated batch cost</span><span className="text-right"><span className="mono font-semibold">{money(c)}</span>{issues.count > 0 && <span className="mt-0.5 block text-[10px] font-medium text-destructive">{recipeIssueLabel(issues)}</span>}</span></div><div className="space-y-2">{r.ingredients.slice(0, 5).map(row => <div key={row.ingredientId} className="flex justify-between text-sm"><span className="text-muted-foreground">{store.ingredients.find(i => i.id === row.ingredientId)?.name || 'Unknown ingredient'}</span><span className="mono text-xs">{row.quantity}{row.unit}</span></div>)}{r.ingredients.length > 5 && <p className="pt-1 text-xs text-primary">+ {r.ingredients.length - 5} more ingredients</p>}</div></div><div className="flex items-center justify-between border-t bg-muted/30 px-5 py-3"><span className="text-xs text-muted-foreground">{r.ingredients.length} ingredients</span><Button variant="ghost" className="text-xs" onClick={() => setSelected(r)}><Pencil size={14} /> Edit recipe</Button></div></Card>; })}</div>{selected && <RecipeModal value={selected} ingredients={store.ingredients} onClose={() => setSelected(null)} onSave={save} />}{printView === 'recipes' && createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && setPrintView(null)}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Recipes</p><h2 className="display text-2xl font-semibold">Recipe Book</h2></div><div className="flex gap-2"><Button variant="ghost" onClick={() => setPrintView(null)}>Close</Button><Button onClick={() => printWithTitle("Little Bliss Bakery - Recipe Book")}><FileText size={16} /> Print or save PDF</Button></div></div><RecipesPrintDocument recipes={store.recipes} store={store} /></div></div>, document.body)}{printView === 'cards' && createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && setPrintView(null)}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Baking reference</p><h2 className="display text-2xl font-semibold">Reference Cards</h2></div><div className="flex gap-2"><Button variant="ghost" onClick={() => setPrintView(null)}>Close</Button><Button onClick={() => printWithTitle("Little Bliss Bakery - Baking Reference Cards")}><FileText size={16} /> Print or save PDF</Button></div></div><BakingReferencePrintDocument recipes={store.recipes} /></div></div>, document.body)}</div>;
}
function RecipeModal({ value, ingredients, onClose, onSave }: { value: Recipe; ingredients: Ingredient[]; onClose: () => void; onSave: (v: Recipe) => void }) {
  const [r, setR] = useState(value); const set = (k: keyof Recipe, v: string | number | boolean) => setR(x => ({ ...x, [k]: v })); const updateRow = (index: number, key: string, val: string | number) => setR(x => ({ ...x, ingredients: x.ingredients.map((row, i) => i === index ? { ...row, [key]: val } : row) }));
  return <Modal title={value.name ? 'Edit recipe' : 'New recipe'} subtitle="Product details, pricing, and ingredient allocations in one place." onClose={onClose} wide><form onSubmit={e => { e.preventDefault(); onSave(r); }} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Recipe name"><Input required value={r.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Oat & Raisin Cookies" /></Field><Field label="Category"><Input value={r.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Cookies" /></Field><Field label="Retail price / dozen"><Input type="number" min="0" step=".01" value={r.retailPriceDozen} onChange={e => set('retailPriceDozen', Number(e.target.value))} /></Field><Field label="Wholesale price / dozen"><Input type="number" min="0" step=".01" value={r.wholesalePriceDozen} onChange={e => set('wholesalePriceDozen', Number(e.target.value))} /></Field><Field label="Batch yield (per recipe)"><Input type="number" min="1" value={r.batchYield} onChange={e => set('batchYield', Number(e.target.value))} /></Field><Field label="Serving size"><Input value={r.servingSize} onChange={e => set('servingSize', e.target.value)} /></Field><Field label="Oven temperature" hint="e.g. 170-180°C"><Input value={r.ovenTemp || ''} onChange={e => set('ovenTemp', e.target.value)} placeholder="170-180°C" /></Field><Field label="Bake time (minutes)" hint="Per tray in the oven"><Input type="number" min="0" value={r.bakeTimeMinutes || ''} onChange={e => set('bakeTimeMinutes', Number(e.target.value))} placeholder="14" /></Field></div><Field label="Description"><textarea className="min-h-16 w-full rounded-lg border bg-background p-3 text-sm outline-none focus:border-primary" value={r.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of this recipe" /></Field><div className="border-t pt-4"><p className="text-sm font-semibold mb-3">Ingredients</p><div className="mb-5 grid gap-4 sm:grid-cols-3"><Field label="Dough weight (g)"><Input type="number" value={r.doughWeight} onChange={e => setR({ ...r, doughWeight: Number(e.target.value) })} /></Field><Field label="Finished weight (g)"><Input type="number" value={r.finishedWeight} onChange={e => setR({ ...r, finishedWeight: Number(e.target.value) })} /></Field><div /></div><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr><th className="px-3 py-2">Ingredient</th><th className="w-28">Quantity</th><th className="w-24">Unit</th><th className="w-28 text-right">Row cost</th><th className="w-12" /></tr></thead><tbody className="divide-y">{r.ingredients.map((row, index) => { const linked = ingredients.find(x => x.id === row.ingredientId) || null; const line = costOfRow(row, ingredients); const link = (nextId: string) => { const next = ingredients.find(x => x.id === nextId); setR(x => ({ ...x, ingredients: x.ingredients.map(old => old === row ? { ...old, ingredientId: nextId, unit: next ? next.unit : old.unit } : old) })); }; return <tr key={`${row.ingredientId}-${index}`}><td className="px-3 py-2"><Select value={row.ingredientId} onChange={e => link(e.target.value)}>{!linked && <option value={row.ingredientId}>{row.ingredientId} — not in pantry</option>}{ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>{!linked && <p className="mt-1 text-[10px] font-medium text-destructive">Link this row to a pantry item to cost it.</p>}</td><td><Input type="number" value={row.quantity} onChange={e => updateRow(index, 'quantity', Number(e.target.value))} /></td><td><Select value={row.unit} onChange={e => updateRow(index, 'unit', e.target.value)}>{!(UNIT_OPTIONS as readonly string[]).includes(row.unit) && <option value={row.unit}>{row.unit}</option>}{UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}</Select></td><td className="mono py-2 text-right text-xs">{line.cost !== null ? money(line.cost) : <span className="text-destructive">{line.issue === 'unpriced' ? 'no price' : line.issue === 'unconvertible' ? 'unit fix' : '—'}</span>}</td><td><IconButton label="Remove ingredient" onClick={() => setR(x => ({ ...x, ingredients: x.ingredients.filter((_, i) => i !== index) }))}><Trash2 size={15} /></IconButton></td></tr>; })}</tbody></table></div><Button type="button" variant="soft" className="mt-3" onClick={() => setR(x => ({ ...x, ingredients: [...x.ingredients, { ingredientId: ingredients[0]?.id || '', quantity: 0, unit: 'g', notes: '' }] }))}><Plus size={15} /> Add ingredient</Button></div><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit"><Check size={16} /> Save recipe</Button></div></form></Modal>;
}

function RecipeVersionHistory({ recipe, onClose, onRevert }: { recipe: Recipe; onClose: () => void; onRevert: (version: RecipeVersion) => void }) {
  return (
    <Modal title={`Version History: ${recipe.name}`} subtitle={`Current version: ${recipe.version || 1}`} onClose={onClose}>
      <div className="space-y-3">
        {recipe.versionHistory && recipe.versionHistory.length > 0 ? (
          recipe.versionHistory.slice().reverse().map((versionEntry) => (
            <div key={versionEntry.version} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
              <div>
                <p className="text-sm font-semibold">Version {versionEntry.version}</p>
                <p className="text-xs text-muted-foreground">{new Date(versionEntry.timestamp).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{versionEntry.changes}</p>
              </div>
              <Button variant="soft" className="text-xs" onClick={() => onRevert(versionEntry)}>Revert</Button>
            </div>
          ))
        ) : (
          <Empty icon={History} title="No version history" detail="This recipe has not been modified yet." />
        )}
      </div>
    </Modal>
  );
}

type OrderTemplate = { id: string; name: string; items: OrderItem[]; notes?: string; createdAt?: string };

function TemplateModal({ templates, onClose, onApply, onDelete, onSave }: {
  templates: OrderTemplate[];
  onClose: () => void;
  onApply: (template: OrderTemplate) => void;
  onDelete: (templateId: string) => void;
  onSave: (value: { mode: 'create' | 'edit'; template?: OrderTemplate }) => void;
}) {
  return (
    <Modal title="Order templates" subtitle="Start a new invoice from a saved set of items" onClose={onClose}>
      <div className="space-y-3">
        <Button variant="soft" className="w-full" onClick={() => onSave({ mode: 'create' })}><Plus size={16} /> New template</Button>
        {templates.length > 0 ? templates.map(t => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-[10px] text-muted-foreground">{t.items.length} item{t.items.length === 1 ? '' : 's'}{t.notes ? ` · ${t.notes}` : ''}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="soft" className="text-xs" onClick={() => onApply(t)}>Use</Button>
              <Button variant="ghost" className="text-xs" onClick={() => onSave({ mode: 'edit', template: t })}>Edit</Button>
              <Button variant="ghost" className="text-xs" onClick={() => onDelete(t.id)}>Delete</Button>
            </div>
          </div>
        )) : <Empty icon={Sparkles} title="No templates yet" detail="Create a template to reuse the same items in one tap." />}
      </div>
    </Modal>
  );
}

function TemplateEditorModal({ value, store, onClose, onSave }: {
  value: { mode: 'create' | 'edit'; template?: OrderTemplate };
  store: Store;
  onClose: () => void;
  onSave: (order: Order) => void;
}) {
  const [name, setName] = useState(value.template?.name || '');
  const [notes, setNotes] = useState(value.template?.notes || '');
  const [items, setItems] = useState<OrderItem[]>(value.template?.items || []);
  const [productId, setProductId] = useState(store.recipes[0]?.id || '');
  const [quantity, setQuantity] = useState('1');

  const addItem = () => {
    const recipe = store.recipes.find(r => r.id === productId);
    if (!recipe) return;
    const qty = Math.max(1, Number(quantity) || 1);
    setItems(prev => [...prev, { productId: recipe.id, quantity: qty, unitPrice: recipe.retailPriceDozen, costSnapshot: roundCurrency(costPerDozen(recipe, store.ingredients)) }]);
    setQuantity('1');
  };
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: 'quantity' | 'unitPrice', value2: number) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value2 } : it));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!items.length) return;
    onSave({ id: value.template?.id || id('order'), customerName: name.trim() || 'Untitled Template', items, notes } as Order);
    onClose();
  };

  return (
    <Modal title={value.mode === 'create' ? 'New template' : 'Edit template'} subtitle="Templates keep the items, name and notes of an order" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Template name"><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly office order" /></Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">Items</p>
          {items.length > 0 && (
            <div className="mb-2 space-y-1.5">
              {items.map((it, idx) => {
                const recipe = store.recipes.find(r => r.id === it.productId);
                return (
                  <div key={`${it.productId}-${idx}`} className="flex items-center gap-2 rounded-lg border p-2">
                    <p className="min-w-0 flex-1 truncate text-sm">{recipe?.name || it.productId}</p>
                    <Input type="number" min="1" value={it.quantity} onChange={e => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))} className="h-8 w-16 px-2 text-right" />
                    <IconButton label={`Remove ${recipe?.name || 'item'}`} type="button" onClick={() => removeItem(idx)}><X size={14} /></IconButton>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <Select value={productId} onChange={e => setProductId(e.target.value)} className="h-9 flex-1">
              {store.recipes.map(r => <option key={r.id} value={r.id}>{r.name || 'Unnamed recipe'}</option>)}
            </Select>
            <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-9 w-16 px-2 text-right" />
            <Button type="button" variant="soft" onClick={addItem} disabled={!store.recipes.length}><Plus size={14} /> Add</Button>
          </div>
          {!store.recipes.length && <p className="mt-1 text-xs text-muted-foreground">Add recipes first to build a template.</p>}
        </div>
        <Field label="Notes (optional)"><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Deliver Fridays before 10am" /></Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!items.length}>Save template</Button>
        </div>
      </form>
    </Modal>
  );
}

function Orders() {
  const { store, update } = useStore(); const isMobile = useIsMobile(); const [edit, setEdit] = useState<Order | null>(null); const [invoice, setInvoice] = useState<Order | null>(null); const [bakingReport, setBakingReport] = useState<Order | null>(null); const [kitchenOrder, setKitchenOrder] = useState<Order | null>(null); const [search, setSearch] = useState(''); const [location] = useLocation(); const [showImport, setShowImport] = useState(false); const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid' | 'archived'>('all'); const [showOrderForm, setShowOrderForm] = useState(false); const urlSearch = useSearch();
  const [advancedFilters, setAdvancedFilters] = useState({ dateFrom: '', dateTo: '', minAmount: '', maxAmount: '', priorityFilter: 'all' as 'all' | 'Normal' | 'Rush' | 'Urgent' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateModal, setTemplateModal] = useState<{ mode: 'create' | 'edit'; template?: any } | null>(null);
  const invoiceSequence = (v: string) => { const m = v.match(/(\d+)\s*$/); return m ? Number(m[1]) : 0; };
  const isOld = (o: Order) => o.archived || (invoiceSequence(o.invoiceNumber) > 0 && invoiceSequence(o.invoiceNumber) < 29);
  const isPaid = (o: Order) => o.paymentStatus?.toLowerCase() === 'paid';
  const reservations = store.reservations;
  const holdFor = (o: Order) => reservationForOrder(reservations, o.id);
  const archiveOrder = (o: Order) => update({ orders: store.orders.map(x => x.id === o.id ? { ...x, archived: true } : x), reservations: releaseReservations(reservations, o.id, 'Order archived'), auditLog: [createAuditEntry('Orders', 'archived', o.id, o.customerName, `Archived order ${o.invoiceNumber} — reserved ingredients released`), ...store.auditLog] });
  const unarchiveOrder = (o: Order) => update({ orders: store.orders.map(x => x.id === o.id ? { ...x, archived: false } : x), reservations: upsertReservation(reservations, o, store.recipes, store.ingredients), auditLog: [createAuditEntry('Orders', 'unarchived', o.id, o.customerName, `Unarchived order ${o.invoiceNumber} — ingredients reserved again`), ...store.auditLog] });
  const deleteOrder = (o: Order) => { const productNames = o.items.map(item => { const p = store.recipes.find(x => x.id === item.productId); return p ? `${item.quantity}× ${p.name}` : `${item.quantity} items`; }).join(', '); const hold = holdFor(o); const wasBaked = hold?.status === 'issued'; const spentValue = wasBaked ? reservationValue(hold, store.ingredients) : 0; update({ orders: store.orders.map(x => x.id === o.id ? { ...x, archived: true } : x), reservations: releaseReservations(reservations, o.id, 'Customer cancelled', spentValue), notifications: [createNotification('Order cancelled', `${o.invoiceNumber} (${o.customerName}) was cancelled.${o.paymentStatus !== 'Paid' ? ' Payment was not received — revenue adjusted.' : ''} Products made: ${productNames}. These products may still be available to sell. ${wasBaked ? `Ingredients were already baked — ${money(spentValue)} written off as waste.` : 'Reserved ingredients were released back to available stock.'}`, 'Orders', o.id), ...store.notifications], auditLog: [createAuditEntry('Orders', 'cancelled', o.id, o.customerName, `Cancelled order ${o.invoiceNumber}. Products: ${productNames}. ${wasBaked ? `Written off ${money(spentValue)} of baked ingredients as waste.` : 'Reserved ingredients released.'}`), ...store.auditLog] }); };
  const toggleExcludeRevenue = (o: Order) => {
    const next = !o.excludeFromRevenue;
    update({
      orders: store.orders.map(x => x.id === o.id ? { ...x, excludeFromRevenue: next } : x),
      auditLog: [createAuditEntry('Orders', next ? 'excluded' : 'included', o.id, o.customerName, `${next ? 'Excluded' : 'Included'} ${o.invoiceNumber} ${next ? 'from' : 'in'} revenue stats. Stock and reservations unchanged.`), ...store.auditLog],
    });
  };
  const markBaked = (o: Order) => { const hold = holdFor(o); if (!hold || hold.status !== 'reserved') return; const stamp = new Date().toISOString(); const transactions: InventoryTransaction[] = hold.lines.map(line => ({ id: id('txn'), ingredientId: line.ingredientId, type: 'use', quantity: line.quantity, date: today(), note: `Baked for ${o.invoiceNumber} — ${o.customerName}` })); const batchNames = hold.lines.length; update({ ingredients: store.ingredients.map(ing => { const line = hold.lines.find(l => l.ingredientId === ing.id); return line ? { ...ing, currentStock: Math.max(0, Math.round((ing.currentStock - line.quantity) * 1000) / 1000) } : ing; }), transactions: [...transactions, ...store.transactions], reservations: issueReservation(reservations, o.id), auditLog: [createAuditEntry('Production', 'baked', o.id, o.customerName, `Issued batch for ${o.invoiceNumber}: ${batchNames} ingredients drawn from stock`), ...store.auditLog], notifications: [createNotification('Batch baked', `${o.invoiceNumber} — ${hold.lines.length} ingredients drawn from stock for ${o.customerName}`, 'Orders', o.id), ...store.notifications] }); void stamp; };
  const saveAsTemplate = (order: Order) => {
    const templates = JSON.parse(localStorage.getItem('order-templates') || '[]');
    const existing = templates.find((t: any) => t.id === order.id);
    const template = {
      id: existing ? existing.id : id('tpl'),
      name: order.customerName || 'Untitled Template',
      items: order.items,
      notes: order.notes,
      createdAt: existing ? existing.createdAt : new Date().toISOString()
    };
    const next = existing ? templates.map((t: any) => (t.id === existing.id ? template : t)) : [...templates, template];
    localStorage.setItem('order-templates', JSON.stringify(next));
    update({ notifications: [createNotification(existing ? 'Template updated' : 'Template saved', `${template.name} ${existing ? 'was updated' : 'saved as an order template'}`, 'Orders', order.id), ...store.notifications] });
  };
  const loadTemplates = () => JSON.parse(localStorage.getItem('order-templates') || '[]');
  const applyTemplate = (template: any) => {
    setEdit({
      id: id('order'),
      invoiceNumber: formatInvoiceNumber(getNextInvoiceNumber(store)),
      orderNumber: '',
      customerName: '',
      customerAddress: '',
      customerCity: '',
      phone: '',
      orderDate: today(),
      dueDate: today(),
      salesRep: '',
      code: '',
      fob: '',
      taxRate: 0,
      items: template.items.map((item: any) => ({ ...item, costSnapshot: 0 })),
      discount: 0,
      deliveryFee: 0,
      paymentStatus: 'Unpaid',
      paymentMethod: 'Cash',
      amountPaid: 0,
      payments: [],
      notes: template.notes || '',
      createdAt: new Date().toISOString(),
      priority: 'Normal'
    });
    setShowTemplates(false);
  };
  const deleteTemplate = (templateId: string) => {
    const templates = loadTemplates().filter((t: any) => t.id !== templateId);
    localStorage.setItem('order-templates', JSON.stringify(templates));
    update({});
  };
  const sorted = [...store.orders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime() || invoiceSequence(b.invoiceNumber) - invoiceSequence(a.invoiceNumber));
  const searchFiltered = sorted.filter(o => {
    const matchesSearch = `${o.customerName} ${o.invoiceNumber} ${o.orderNumber}`.toLowerCase().includes(search.toLowerCase());
    const matchesDateFrom = !advancedFilters.dateFrom || o.orderDate >= advancedFilters.dateFrom;
    const matchesDateTo = !advancedFilters.dateTo || o.orderDate <= advancedFilters.dateTo;
    const total = calculateOrderTotal(o.items, o.discount, o.deliveryFee, o.taxRate || 0);
    const matchesMinAmount = !advancedFilters.minAmount || total >= Number(advancedFilters.minAmount);
    const matchesMaxAmount = !advancedFilters.maxAmount || total <= Number(advancedFilters.maxAmount);
    const matchesPriority = advancedFilters.priorityFilter === 'all' || o.priority === advancedFilters.priorityFilter;
    return matchesSearch && matchesDateFrom && matchesDateTo && matchesMinAmount && matchesMaxAmount && matchesPriority;
  });
  const archived = searchFiltered.filter(o => isOld(o));
  const active = searchFiltered.filter(o => !isOld(o));
  const unpaid = active.filter(o => !isPaid(o));
  const paid = active.filter(o => isPaid(o));
  const displayOrders = filter === 'all' ? active : filter === 'unpaid' ? unpaid : filter === 'paid' ? paid : archived;
  const counts = { all: active.length, unpaid: unpaid.length, paid: paid.length, archived: archived.length };
  const newOrder = () => setEdit({ id: id('order'), invoiceNumber: formatInvoiceNumber(getNextInvoiceNumber(store)), orderNumber: '', customerName: '', customerAddress: '', customerCity: '', phone: '', orderDate: today(), dueDate: today(), salesRep: '', code: '', fob: '', taxRate: 0, items: [{ productId: store.recipes[0]?.id || '', quantity: 1, unitPrice: store.recipes[0]?.retailPriceDozen || 0, costSnapshot: 0 }], discount: 0, deliveryFee: 0, paymentStatus: 'Unpaid', paymentMethod: 'Cash', amountPaid: 0, payments: [], notes: '', createdAt: new Date().toISOString(), priority: 'Normal' });
  useEffect(() => { const params = new URLSearchParams(urlSearch); if (params.get('new') === '1') { newOrder(); clearSearchParam('new'); } const invoiceId = params.get('invoice'); if (invoiceId) { const selected = store.orders.find(order => order.id === invoiceId); if (selected) setInvoice(selected); clearSearchParam('invoice'); } }, [location, urlSearch]);
  const saveOrder = (order: Order) => { const exists = store.orders.some(x => x.id === order.id); const existingClient = store.clients.find(c => c.name.toLowerCase() === order.customerName.toLowerCase()); const newClient = !exists && order.customerName && !existingClient ? { id: id('cli'), name: order.customerName, address: order.customerAddress, city: order.customerCity, phone: order.phone, email: '', notes: '', createdAt: new Date().toISOString() } : null; const held = upsertReservation(reservations, order, store.recipes, store.ingredients); const short = preBakePlan(order, store.ingredients, store.recipes, reservations).shortageCount; update({ orders: exists ? store.orders.map(x => x.id === order.id ? order : x) : [order, ...store.orders], reservations: held, clients: newClient ? [newClient, ...store.clients] : store.clients, settings: { ...store.settings, nextInvoiceNumber: exists ? store.settings.nextInvoiceNumber : getNextInvoiceNumber(store) + 1 }, auditLog: [createAuditEntry('Orders', exists ? 'updated' : 'created', order.id, order.customerName, `${exists ? 'Updated' : 'Created'} order ${order.invoiceNumber} for ${order.customerName}${short > 0 ? ` — ${short} ingredient(s) short on hand` : ''}`), ...store.auditLog], notifications: [createNotification(`Order ${exists ? 'updated' : 'created'}`, `${order.invoiceNumber} — ${order.customerName} was ${exists ? 'updated' : 'created'}${short > 0 ? `. ${short} ingredient(s) need restocking before baking.` : '. Ingredients reserved.'}`, 'Orders', order.id), ...store.notifications] }); setEdit(null); };
  const renderOrderRow = (o: Order, opts?: { showArchive?: boolean; showUnarchive?: boolean }) => {
    const total = calculateOrderTotal(o.items, o.discount, o.deliveryFee, o.taxRate || 0);
    const outstanding = calculateOrderOutstanding(o.items, o.discount, o.deliveryFee, o.taxRate || 0, o.amountPaid);
    const archived = isOld(o);
    if (isMobile) {
      return (
        <Card key={o.id} className="p-4" onClick={() => setInvoice(o)}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', archived ? 'bg-primary/15 text-primary' : 'bg-secondary text-secondary-foreground')}>
                {o.customerName.split(' ').map(x => x[0]).join('').slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className={cx('truncate text-sm font-semibold', archived && 'text-primary')}>{o.customerName}</p>
                <p className="text-[10px] text-muted-foreground">{o.invoiceNumber} · {shortDate(o.dueDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Status status={o.paymentStatus} />
              <PriorityBadge priority={o.priority} />
              {o.excludeFromRevenue && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[9px] font-semibold text-destructive">Excluded</span>}
              <HoldBadge reservation={holdFor(o)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="mono text-sm font-semibold">{money(total)}</p>
              </div>
              {!archived && outstanding > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Due</p>
                  <p className="mono text-sm font-semibold text-primary">{money(outstanding)}</p>
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              <IconButton label={`Edit ${o.invoiceNumber}`} onClick={(e) => { e.stopPropagation(); setEdit(o); }}>
                <Pencil size={15} />
              </IconButton>
              {holdFor(o)?.status === 'reserved' && !archived && (
                <IconButton label="Mark as baked — draw ingredients from stock" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Mark ${o.invoiceNumber} as baked? Ingredients for this batch will be drawn from stock.`)) markBaked(o); }}>
                  <Flame size={15} />
                </IconButton>
              )}
              {opts?.showUnarchive && (
                <IconButton label="Unarchive" onClick={(e) => { e.stopPropagation(); unarchiveOrder(o); }}>
                  <RefreshCw size={15} />
                </IconButton>
              )}
              {opts?.showArchive && !archived && (
                <IconButton label="Cancel order" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Cancel ${o.invoiceNumber}? The invoice will be kept and products made may still be sold.`)) deleteOrder(o); }}>
                  <Trash2 size={15} />
                </IconButton>
              )}
              <IconButton label={o.excludeFromRevenue ? 'Include in revenue' : 'Exclude from revenue'} onClick={(e) => { e.stopPropagation(); toggleExcludeRevenue(o); }}>
                <EyeOff size={15} />
              </IconButton>
              <IconButton label="View invoice" onClick={() => setInvoice(o)}>
                <Eye size={15} />
              </IconButton>
            </div>
          </div>
        </Card>
      );
    }
    return (
      <tr key={o.id} className={cx('hover:bg-muted/25', archived && 'opacity-50')}>
        <td className="px-5 py-4 text-muted-foreground">{shortDate(o.orderDate)}</td>
        <td>
          <div className="flex items-center gap-2">
            <span className={cx('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold', archived ? 'bg-primary/15 text-primary' : 'bg-secondary text-secondary-foreground')}>
              {o.customerName.split(' ').map(x => x[0]).join('').slice(0, 2)}
            </span>
            <div>
              <p className={cx('text-sm font-semibold', archived && 'text-primary')}>{o.customerName}</p>
              <p className="text-[10px] text-muted-foreground">{o.invoiceNumber}</p>
            </div>
          </div>
        </td>
        <td>
          <div className="space-y-0.5">
            <p className="text-xs">{o.items.map(i => { const p = store.recipes.find(x => x.id === i.productId); return p ? `${i.quantity}× ${p.name}` : `${i.quantity} items`; }).join(', ')}</p>
          </div>
        </td>
        <td className="mono">{money(total)}</td>
        <td><div className="flex flex-wrap items-center gap-1.5"><Status status={o.paymentStatus} /><HoldBadge reservation={holdFor(o)} /></div></td>
        <td className="pr-5 text-right">
          <div className="flex items-center justify-end gap-1">
            <PriorityBadge priority={o.priority} />
            {o.excludeFromRevenue && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[9px] font-semibold text-destructive">Excluded</span>}
            <IconButton label={`Edit ${o.invoiceNumber}`} onClick={() => setEdit(o)}>
              <Pencil size={16} />
            </IconButton>
            {holdFor(o)?.status === 'reserved' && !archived && (
              <IconButton label="Mark as baked — draw ingredients from stock" onClick={() => { if (window.confirm(`Mark ${o.invoiceNumber} as baked? Ingredients for this batch will be drawn from stock.`)) markBaked(o); }}>
                <Flame size={16} />
              </IconButton>
            )}
            <IconButton label={o.excludeFromRevenue ? 'Include in revenue' : 'Exclude from revenue'} onClick={() => toggleExcludeRevenue(o)}>
              <EyeOff size={16} />
            </IconButton>
            <IconButton label="View invoice" onClick={() => setInvoice(o)}>
              <Eye size={16} />
            </IconButton>
            {opts?.showUnarchive && (
              <IconButton label="Unarchive" onClick={() => unarchiveOrder(o)}>
                <RefreshCw size={16} />
              </IconButton>
            )}
            {opts?.showArchive && !archived && (
              <IconButton label="Cancel order" onClick={() => { if (window.confirm(`Cancel ${o.invoiceNumber}?`)) deleteOrder(o); }}>
                <Trash2 size={16} />
              </IconButton>
            )}
          </div>
        </td>
      </tr>
    );
  };
  if (isMobile) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="display text-xl font-semibold">Orders</h1>
          <div className="flex gap-2">
            <Button variant="soft" onClick={() => setShowImport(true)}><Upload size={16} /> Import</Button>
            <Button variant="soft" onClick={() => setShowOrderForm(true)}><FileText size={16} /> Form</Button>
            <Button variant="soft" onClick={() => setShowTemplates(true)} aria-label="Templates"><Sparkles size={16} /></Button>
            <Button onClick={newOrder}><Plus size={16} /> New</Button>
          </div>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="pl-9" />
        </div>
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {([['all', 'All'], ['unpaid', 'Unpaid'], ['paid', 'Paid'], ['archived', 'Archived']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={cx('shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', filter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
              {label} <span className="ml-1 opacity-60">{counts[key]}</span>
            </button>
          ))}
        </div>
        <Button variant="ghost" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="mb-4 w-full"><SlidersHorizontal size={14} /> Advanced filters</Button>
        {showAdvancedFilters && (
          <Card className="mb-4 p-4">
            <div className="grid gap-3">
              <div className="flex gap-2">
                <Input type="date" value={advancedFilters.dateFrom} onChange={e => setAdvancedFilters({...advancedFilters, dateFrom: e.target.value})} placeholder="From date" className="flex-1" />
                <Input type="date" value={advancedFilters.dateTo} onChange={e => setAdvancedFilters({...advancedFilters, dateTo: e.target.value})} placeholder="To date" className="flex-1" />
              </div>
              <div className="flex gap-2">
                <Input type="number" value={advancedFilters.minAmount} onChange={e => setAdvancedFilters({...advancedFilters, minAmount: e.target.value})} placeholder="Min amount" className="flex-1" />
                <Input type="number" value={advancedFilters.maxAmount} onChange={e => setAdvancedFilters({...advancedFilters, maxAmount: e.target.value})} placeholder="Max amount" className="flex-1" />
              </div>
              <Select value={advancedFilters.priorityFilter} onChange={e => setAdvancedFilters({...advancedFilters, priorityFilter: e.target.value as 'all' | 'Normal' | 'Rush' | 'Urgent'})}>
                <option value="all">All priorities</option>
                <option value="Normal">Normal</option>
                <option value="Rush">Rush</option>
                <option value="Urgent">Urgent</option>
              </Select>
              <Button variant="ghost" onClick={() => setAdvancedFilters({ dateFrom: '', dateTo: '', minAmount: '', maxAmount: '', priorityFilter: 'all' })}>Clear filters</Button>
            </div>
          </Card>
        )}
        {displayOrders.length > 0 ? (
          <div className="space-y-2">{displayOrders.map(o => renderOrderRow(o, { showArchive: filter !== 'archived', showUnarchive: filter === 'archived' }))}</div>
        ) : (
          <Empty icon={Receipt} title={filter === 'unpaid' ? 'All paid up' : filter === 'paid' ? 'No paid orders yet' : filter === 'archived' ? 'No archived orders' : 'No orders yet'} detail={filter === 'unpaid' ? 'Every order has been settled.' : 'Create your first invoice to start tracking sales.'} action={filter !== 'archived' ? <Button onClick={newOrder}><Plus size={16} /> New order</Button> : undefined} />
        )}
        {edit && <OrderModal value={edit} store={store} onClose={() => setEdit(null)} onSave={saveOrder} />}
        {invoice && <InvoicePreview order={invoice} store={store} onClose={() => setInvoice(null)} onEdit={o => { setInvoice(null); setEdit(o); }} onBakingReport={o => { setInvoice(null); setBakingReport(o); }} onKitchenOrder={o => { setInvoice(null); setKitchenOrder(o); }} onToggleExclude={o => { toggleExcludeRevenue(o); setInvoice({ ...o, excludeFromRevenue: !o.excludeFromRevenue }); }} />}
        {bakingReport && <BakingReport order={bakingReport} store={store} onClose={() => setBakingReport(null)} />}
        {kitchenOrder && <KitchenOrder order={kitchenOrder} store={store} onClose={() => setKitchenOrder(null)} />}
        {showImport && <ExcelImportModal store={store} update={update} onClose={() => setShowImport(false)} />}
        {showOrderForm && createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowOrderForm(false)}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Kitchen order form</p><h2 className="display text-2xl font-semibold">Blank Template</h2></div><div className="flex gap-2"><Button variant="ghost" onClick={() => setShowOrderForm(false)}>Close</Button><Button onClick={() => printWithTitle("Little Bliss Bakery - Kitchen Order Form", { landscape: true })} title="Tip: In the print dialog, disable Headers and footers for a clean print"><FileText size={16} /> Print order form</Button></div></div><KitchenOrderFormDocument numberOfSlots={4} /></div></div>, document.body)}
        {showTemplates && <TemplateModal templates={loadTemplates()} onClose={() => setShowTemplates(false)} onApply={applyTemplate} onDelete={deleteTemplate} onSave={setTemplateModal} />}
        {templateModal && <TemplateEditorModal value={templateModal} store={store} onClose={() => setTemplateModal(null)} onSave={saveAsTemplate} />}
      </div>
    );
  }
  return (
    <div>
      <PageHeader eyebrow="Sales desk" title="Orders" description="Create invoices with the same clean sequence as your Excel book." action={<div className="flex gap-2"><Button variant="soft" onClick={() => setShowImport(true)}><Upload size={16} /> Import Excel</Button><Button variant="soft" onClick={() => setShowOrderForm(true)}><FileText size={16} /> Order form</Button><Button variant="soft" onClick={() => setShowTemplates(true)}><Sparkles size={16} /> Templates</Button><Button data-testid="button-add-order" onClick={newOrder}><Plus size={17} /> New invoice</Button></div>} />
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
          <Input data-testid="input-search-orders" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer or invoice no." className="pl-9" />
        </div>
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {([['all', 'All active'], ['unpaid', 'Unpaid'], ['paid', 'Paid'], ['archived', 'Archived']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={cx('shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-colors', filter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            {label} <span className="ml-1 opacity-60">({counts[key]})</span>
          </button>
        ))}
      </div>
      <Button variant="ghost" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}><SlidersHorizontal size={14} /> Advanced filters</Button>
      {showAdvancedFilters && (
        <Card className="mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div><Field label="From date"><Input type="date" value={advancedFilters.dateFrom} onChange={e => setAdvancedFilters({...advancedFilters, dateFrom: e.target.value})} /></Field></div>
            <div><Field label="To date"><Input type="date" value={advancedFilters.dateTo} onChange={e => setAdvancedFilters({...advancedFilters, dateTo: e.target.value})} /></Field></div>
            <div><Field label="Min amount"><Input type="number" value={advancedFilters.minAmount} onChange={e => setAdvancedFilters({...advancedFilters, minAmount: e.target.value})} /></Field></div>
            <div><Field label="Max amount"><Input type="number" value={advancedFilters.maxAmount} onChange={e => setAdvancedFilters({...advancedFilters, maxAmount: e.target.value})} /></Field></div>
            <div className="sm:col-span-2"><Field label="Priority"><Select value={advancedFilters.priorityFilter} onChange={e => setAdvancedFilters({...advancedFilters, priorityFilter: e.target.value as 'all' | 'Normal' | 'Rush' | 'Urgent'})}><option value="all">All priorities</option><option value="Normal">Normal</option><option value="Rush">Rush</option><option value="Urgent">Urgent</option></Select></Field></div>
            <div className="sm:col-span-2 flex items-end"><Button variant="ghost" onClick={() => setAdvancedFilters({ dateFrom: '', dateTo: '', minAmount: '', maxAmount: '', priorityFilter: 'all' })}>Clear filters</Button></div>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        {displayOrders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/55 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-5 py-3.5">Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th className="pr-5 text-right"> </th></tr>
              </thead>
              <tbody className="divide-y">{displayOrders.map(o => renderOrderRow(o, { showArchive: filter !== 'archived', showUnarchive: filter === 'archived' }))}</tbody>
            </table>
          </div>
        ) : (
          <Empty icon={Receipt} title={filter === 'unpaid' ? 'All paid up' : filter === 'paid' ? 'No paid orders yet' : filter === 'archived' ? 'No archived orders' : 'No orders yet'} detail={filter === 'unpaid' ? 'Every order has been settled.' : 'Create your first invoice to start tracking sales.'} action={filter !== 'archived' ? <Button onClick={newOrder}><Plus size={16} /> New order</Button> : undefined} />
        )}
      </Card>
      {edit && <OrderModal value={edit} store={store} onClose={() => setEdit(null)} onSave={saveOrder} />}
      {invoice && <InvoicePreview order={invoice} store={store} onClose={() => setInvoice(null)} onEdit={o => { setInvoice(null); setEdit(o); }} onBakingReport={o => { setInvoice(null); setBakingReport(o); }} onKitchenOrder={o => { setInvoice(null); setKitchenOrder(o); }} onToggleExclude={o => { toggleExcludeRevenue(o); setInvoice({ ...o, excludeFromRevenue: !o.excludeFromRevenue }); }} />}
      {bakingReport && <BakingReport order={bakingReport} store={store} onClose={() => setBakingReport(null)} />}
      {kitchenOrder && <KitchenOrder order={kitchenOrder} store={store} onClose={() => setKitchenOrder(null)} />}
      {showImport && <ExcelImportModal store={store} update={update} onClose={() => setShowImport(false)} />}
      {showTemplates && <TemplateModal templates={loadTemplates()} onClose={() => setShowTemplates(false)} onApply={applyTemplate} onDelete={deleteTemplate} onSave={setTemplateModal} />}
      {templateModal && <TemplateEditorModal value={templateModal} store={store} onClose={() => setTemplateModal(null)} onSave={saveAsTemplate} />}
      {showOrderForm && createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowOrderForm(false)}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Kitchen order form</p><h2 className="display text-2xl font-semibold">Blank Template</h2></div><div className="flex gap-2"><Button variant="ghost" onClick={() => setShowOrderForm(false)}>Close</Button><Button onClick={() => printWithTitle("Little Bliss Bakery - Kitchen Order Form", { landscape: true })} title="Tip: In the print dialog, disable Headers and footers for a clean print"><FileText size={16} /> Print order form</Button></div></div><KitchenOrderFormDocument numberOfSlots={4} /></div></div>, document.body)}
    </div>
  );
}
function BakingReport({ order, store, onClose }: { order: Order; store: Store; onClose: () => void }) {
  return createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Baking report</p><h2 className="display text-2xl font-semibold">{order.invoiceNumber}</h2></div><div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Close</Button><Button onClick={() => printWithTitle("Little Bliss Bakery - Baking Report - " + order.invoiceNumber)}><FileText size={16} /> Print or save PDF</Button></div></div><BakingReportDocument order={order} store={store} /></div></div>, document.body);
}
function KitchenOrder({ order, store, onClose }: { order: Order; store: Store; onClose: () => void }) {
  return createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Kitchen order</p><h2 className="display text-2xl font-semibold">{order.invoiceNumber}</h2></div><div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Close</Button><Button onClick={() => printWithTitle("Little Bliss Bakery - Kitchen Order - " + order.invoiceNumber)}><FileText size={16} /> Print for kitchen</Button></div></div><KitchenOrderDocument order={order} store={store} /></div></div>, document.body);
}
function PreBakeCheck({ plan, hold, isNew }: { plan: PreBakePlan; hold?: MaterialReservation; isNew: boolean }) {
  const [open, setOpen] = useState(true);
  const problem = plan.missingCount > 0 || plan.shortageCount > 0 || plan.unconvertibleCount > 0;
  const tone = problem ? 'border-destructive/40 bg-destructive/5' : 'border-emerald-300 bg-emerald-50';
  const head = plan.missingCount > 0 ? `${plan.missingCount} missing ingredient${plan.missingCount !== 1 ? 's' : ''}`
    : plan.unconvertibleCount > 0 ? `${plan.unconvertibleCount} ingredient${plan.unconvertibleCount !== 1 ? 's' : ''} with a unit mismatch`
    : plan.shortageCount > 0 ? `Short ${plan.shortageCount} ingredient${plan.shortageCount !== 1 ? 's' : ''}`
    : 'All ingredients available';
  return (
    <div className={cx('my-5 rounded-xl border', tone)}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', problem ? 'bg-destructive/15 text-destructive' : 'bg-emerald-600/15 text-emerald-700')}>
          {problem ? <CircleAlert size={16} /> : <Check size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Pre-bake check</p>
          <p className={cx('text-[11px] font-medium', problem ? 'text-destructive' : 'text-emerald-800')}>{head}</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="mono text-xs font-semibold">{plan.totalBatches} batch{plan.totalBatches !== 1 ? 'es' : ''}</p>
          <p className="text-[10px] text-muted-foreground">{money(plan.requiredCost)} at risk</p>
        </div>
        <ChevronDown size={16} className={cx('text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t px-4 py-3">
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
            <span className="text-muted-foreground">Batches: <span className="mono font-semibold text-foreground">{plan.totalBatches}</span></span>
            <span className="text-muted-foreground">Ingredient cost: <span className="mono font-semibold text-foreground">{money(plan.requiredCost)}</span></span>
            {plan.shortfallCost > 0 && <span className="text-muted-foreground">Cost of the gap: <span className="mono font-semibold text-destructive">{money(plan.shortfallCost)}</span></span>}
            {plan.unpricedCount > 0 && <span className="text-muted-foreground">Unpriced: <span className="font-semibold text-foreground">{plan.unpricedCount}</span></span>}
          </div>
          {plan.batches.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {plan.batches.map((b, i) => <span key={`${b.recipe.id}-${i}`} className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-semibold">{b.batches}× {b.recipe.name}{b.surplus > 0 ? ` (+${b.surplus} spare)` : ''}</span>)}
            </div>
          )}
          {plan.lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  <tr><th className="pb-1.5 font-medium">Ingredient</th><th className="pb-1.5 text-right font-medium">Needed</th><th className="pb-1.5 text-right font-medium">On hand</th><th className="pb-1.5 text-right font-medium">Held</th><th className="pb-1.5 text-right font-medium">Free</th><th className="pb-1.5 text-right font-medium">Gap</th></tr>
                </thead>
                <tbody className="divide-y">
                  {plan.lines.map(l => <tr key={l.ingredientId} className={cx(!l.sufficient && 'bg-destructive/5')}>
                    <td className="py-1.5 pr-2 font-medium">
                      {l.ingredientName}
                      {l.missing && <span className="ml-1 text-destructive">(not in pantry)</span>}
                      {l.unitMismatch && <span className="ml-1 text-destructive">(unit mismatch — {l.unconvertibleRows} row{l.unconvertibleRows !== 1 ? 's' : ''} not counted)</span>}
                      {l.unitCost === null && !l.missing && <span className="ml-1 text-muted-foreground">(no price)</span>}
                    </td>
                    <td className="mono py-1.5 text-right">{l.required.toLocaleString()} {l.unit}</td>
                    <td className="mono py-1.5 text-right text-muted-foreground">{l.onHand.toLocaleString()}</td>
                    <td className="mono py-1.5 text-right text-muted-foreground">{l.reservedElsewhere > 0 ? l.reservedElsewhere.toLocaleString() : '—'}</td>
                    <td className="mono py-1.5 text-right">{l.available.toLocaleString()}</td>
                    <td className={cx('mono py-1.5 text-right font-semibold', l.shortfall > 0 ? 'text-destructive' : 'text-muted-foreground')}>{l.shortfall > 0 ? l.shortfall.toLocaleString() : '—'}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          ) : <p className="text-[11px] text-muted-foreground">Add an item to see what this batch needs.</p>}
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            {hold?.status === 'issued'
              ? 'Already baked — the ingredients for this batch have been drawn from stock and will not be held again.'
              : hold?.status === 'reserved'
                ? 'Saving updates the existing hold for this order.'
                : isNew
                  ? 'Saving this order reserves these ingredients so no other order can spend them. Nothing leaves stock until you mark the batch as baked.'
                  : 'Saving this order reserves these ingredients. Nothing leaves stock until you mark the batch as baked.'}
          </p>
        </div>
      )}
    </div>
  );
}
function OrderModal({ value, store, onClose, onSave }: { value: Order; store: Store; onClose: () => void; onSave: (v: Order) => void }) {
  const [o, setO] = useState(value);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(!value.customerName);
  const [expandedItem, setExpandedItem] = useState<number | null>(0);
  const total = calculateOrderTotal(o.items, o.discount, o.deliveryFee, o.taxRate || 0);
  const set = (k: keyof Order, v: string | number) => setO(x => ({ ...x, [k]: v }));
  const snapshot = (item: Order['items'][number]) => { const r = store.recipes.find(x => x.id === item.productId); return r ? roundCurrency(costPerDozen(r, store.ingredients)) : item.costSnapshot; };
  const updateItem = (idx: number, key: string, val: string | number) => setO(x => ({ ...x, items: x.items.map((row, i) => i === idx ? { ...row, [key]: val } : row) }));
  const handlePasteParse = () => { if (!pasteText.trim()) return; const parsed = parseOrderText(pasteText, store.recipes); setO(current => ({ ...current, customerName: parsed.customerName || current.customerName, items: parsed.items.map(i => ({ ...i, costSnapshot: (() => { const r = store.recipes.find(x => x.id === i.productId); return r ? roundCurrency(costPerDozen(r, store.ingredients)) : 0; })() })), dueDate: parsed.dueDate || current.dueDate, notes: parsed.notes || current.notes })); setShowPaste(false); setPasteText(''); };
  const addItem = () => { setO(x => ({ ...x, items: [...x.items, { productId: store.recipes[0]?.id || '', quantity: 1, unitPrice: store.recipes[0]?.retailPriceDozen || 0, costSnapshot: 0 }] })); setExpandedItem(o.items.length); };
  const plan = preBakePlan(o, store.ingredients, store.recipes, store.reservations);
  const hold = reservationForOrder(store.reservations, value.id);
  return (
    <Modal title={value.customerName ? `Edit ${value.invoiceNumber}` : 'New customer order'} subtitle="Save a price snapshot so this order stays historically accurate." onClose={onClose} wide>
      <form onSubmit={e => { e.preventDefault(); onSave({ ...o, items: o.items.map(item => ({ ...item, costSnapshot: snapshot(item) })) }); }}>
        {showPaste && (
          <div className="mb-5 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary"><Upload size={14} /></span>
                <p className="text-sm font-semibold">Paste a WhatsApp order</p>
              </div>
              <button type="button" onClick={() => setShowPaste(false)} className="text-xs text-muted-foreground hover:text-foreground">Skip</button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Paste the message — auto-detects customer, products, quantities, and delivery date.</p>
            <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder={'e.g.\nHi, I need 5 boxes Oat Raisin Cookies and 2 boxes Jam Tarts for Friday'} className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20" />
            <Button type="button" className="mt-3 w-full" onClick={handlePasteParse}>Parse and fill form</Button>
          </div>
        )}
        {!showPaste && (
          <div className="mb-4 flex items-center gap-2">
            <button type="button" onClick={() => setShowPaste(true)} className="flex items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Upload size={12} /> Paste WhatsApp order
            </button>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {store.clients.length > 0 && !o.customerName && (
            <div className="sm:col-span-3">
              <Field label="Choose a saved client (optional)">
                <Select value="" onChange={e => { const c = store.clients.find(x => x.id === e.target.value); if (c) setO(current => ({ ...current, customerName: c.name, customerAddress: c.address, customerCity: c.city, phone: c.phone })); }}>
                  <option value="">— Type manually or pick a client —</option>
                  {store.clients.sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}{c.city ? ` (${c.city})` : ''}</option>)}
                </Select>
              </Field>
            </div>
          )}
          <Field label="Customer name"><Input required value={o.customerName} onChange={e => set('customerName', e.target.value)} /></Field>
          <Field label="Phone"><Input value={o.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Order number"><Input value={o.orderNumber} onChange={e => set('orderNumber', e.target.value)} /></Field>
          <Field label="Order date"><Input type="date" value={o.orderDate} onChange={e => set('orderDate', e.target.value)} /></Field>
          <Field label="Due date"><Input type="date" value={o.dueDate} onChange={e => set('dueDate', e.target.value)} /></Field>
          <Field label="Payment status"><Select value={o.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}><option>Unpaid</option><option>Deposit Paid</option><option>Partially Paid</option><option>Paid</option></Select></Field>
          <Field label="Payment method"><Select value={o.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}><option>Cash</option><option>Check</option><option>Credit</option><option>Other</option><option>Mobile money</option><option>Bank transfer</option></Select></Field>
          <Field label="Priority"><Select value={o.priority || 'Normal'} onChange={e => set('priority', e.target.value as 'Normal' | 'Rush' | 'Urgent')}><option>Normal</option><option>Rush</option><option>Urgent</option></Select></Field>
        </div>
        <div className="my-5 rounded-xl border">
          <div className="flex items-center justify-between border-b bg-muted/35 px-4 py-3">
            <p className="text-sm font-semibold">Items ({o.items.length})</p>
            <Button type="button" variant="soft" className="min-h-8 px-2.5 text-xs" onClick={addItem}><Plus size={14} /> Add item</Button>
          </div>
          <div className="divide-y">
            {o.items.map((item, idx) => {
              const isExpanded = expandedItem === idx;
              const product = store.recipes.find(p => p.id === item.productId);
              const itemTotal = item.quantity * item.unitPrice;
              return (
                <div key={idx} className={cx('transition-colors', isExpanded && 'bg-muted/20')}>
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedItem(isExpanded ? null : idx)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{product?.name || 'Select product'}</p>
                      <p className="text-[10px] text-muted-foreground">{item.quantity} × {money(item.unitPrice)} = {money(itemTotal)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setO(x => ({ ...x, items: x.items.filter((_, i) => i !== idx) })); }}><Trash2 size={14} className="text-muted-foreground" /></Button>
                      <ChevronDown size={16} className={cx('text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-4 space-y-3">
                      <Field label="Product">
                        <Select value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)}>
                          {store.recipes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Quantity"><Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} /></Field>
                        <Field label="Unit price"><Input type="number" min="0" step=".01" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))} /></Field>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <PreBakeCheck plan={plan} hold={hold} isNew={!value.customerName} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Discount"><Input type="number" min="0" step=".01" value={o.discount} onChange={e => set('discount', Number(e.target.value))} /></Field>
          <Field label="Delivery fee"><Input type="number" min="0" step=".01" value={o.deliveryFee} onChange={e => set('deliveryFee', Number(e.target.value))} /></Field>
          <Field label="Amount paid"><Input type="number" min="0" step=".01" value={o.amountPaid} onChange={e => set('amountPaid', Number(e.target.value))} /></Field>
        </div>
        <div className="mt-4 rounded-lg border border-dashed p-3">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={!!o.excludeFromRevenue} onChange={e => setO(x => ({ ...x, excludeFromRevenue: e.target.checked }))} className="h-4 w-4 rounded border-input" />
            <span className="text-sm font-medium">Don't count this order in revenue</span>
          </label>
          <p className="mt-1 pl-6 text-[10px] text-muted-foreground">Revenue, reports and analytics will ignore this receipt. Stock, reservations and production are never affected.</p>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save invoice</Button>
        </div>
      </form>
    </Modal>
  );
}
function InvoicePreview({ order, store, onClose, onEdit, onBakingReport, onKitchenOrder, onToggleExclude }: { order: Order; store: Store; onClose: () => void; onEdit?: (o: Order) => void; onBakingReport?: (o: Order) => void; onKitchenOrder?: (o: Order) => void; onToggleExclude?: (o: Order) => void }) {
  return createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Print preview</p><h2 className="display text-2xl font-semibold">{order.invoiceNumber}</h2>{order.excludeFromRevenue && <span className="mt-1 inline-block rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">Excluded from revenue — stock unchanged</span>}</div><div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={onClose}>Close preview</Button>{onEdit && <Button variant="soft" onClick={() => onEdit(order)}><Pencil size={16} /> Edit order</Button>}{onToggleExclude && <Button variant="soft" onClick={() => onToggleExclude(order)} title={order.excludeFromRevenue ? 'This receipt will count toward revenue again' : 'Disconnect this receipt from revenue, reports and analytics. Stock stays unchanged.'}><EyeOff size={16} /> {order.excludeFromRevenue ? 'Include in revenue' : 'Exclude from revenue'}</Button>}{onBakingReport && <Button variant="soft" onClick={() => onBakingReport(order)}><BookOpen size={16} /> Baking report</Button>}{onKitchenOrder && <Button variant="soft" onClick={() => onKitchenOrder(order)}><ClipboardList size={16} /> Kitchen order</Button>}<Button onClick={() => printWithTitle("Little Bliss Bakery - Invoice - " + order.invoiceNumber)}><FileText size={16} /> Print or save PDF</Button></div></div><InvoiceDocument order={order} recipes={store.recipes} settings={store.settings} /></div></div>, document.body);
}

function ShoppingListModal({ store, onClose }: { store: Store; onClose: () => void }) {
  const [mode, setMode] = useState<'blank' | 'low-stock' | 'all'>('blank');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [boughtBy, setBoughtBy] = useState('');
  
  return createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Print preview</p><h2 className="display text-2xl font-semibold">Shopping List</h2></div><div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Close preview</Button><Button onClick={() => printWithTitle("Little Bliss Bakery - Shopping List")}><FileText size={16} /> Print or save PDF</Button></div></div><div className="no-print mb-4 flex items-center gap-4 p-4 bg-muted/50 rounded-lg"><span className="text-sm font-medium">Mode:</span><div className="flex gap-2"><button onClick={() => setMode('blank')} className={cx('px-3 py-1.5 rounded-lg text-xs font-semibold', mode === 'blank' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>Blank template</button><button onClick={() => setMode('low-stock')} className={cx('px-3 py-1.5 rounded-lg text-xs font-semibold', mode === 'low-stock' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>Low stock only</button><button onClick={() => setMode('all')} className={cx('px-3 py-1.5 rounded-lg text-xs font-semibold', mode === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>All ingredients</button></div></div><div className="no-print mb-4 grid gap-4 sm:grid-cols-2"><Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field><Field label="Bought by"><Input value={boughtBy} onChange={e => setBoughtBy(e.target.value)} placeholder="Name" /></Field></div><ShoppingListDocument ingredients={store.ingredients} settings={store.settings} mode={mode} date={date} boughtBy={boughtBy} /></div></div>, document.body);
}

function StockCheckSheetModal({ store, onClose }: { store: Store; onClose: () => void }) {
  const [mode, setMode] = useState<'blank' | 'low-stock' | 'all'>('blank');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [baker, setBaker] = useState('');
  const [sheetNumber, setSheetNumber] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  
  return createPortal(<div className="fixed inset-0 z-[9999] overflow-auto bg-foreground/35 p-0 backdrop-blur-[2px] sm:p-6" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="mx-auto min-h-full w-full max-w-4xl bg-background p-4 shadow-2xl sm:min-h-0 sm:rounded-2xl sm:p-6"><div className="no-print mb-4 flex items-center justify-between gap-3"><div><p className="mono text-[10px] font-semibold uppercase tracking-[.18em] text-primary">Print preview</p><h2 className="display text-2xl font-semibold">Stock Check Sheet</h2></div><div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Close preview</Button><Button onClick={() => printWithTitle("Little Bliss Bakery - Stock Check Sheet")}><FileText size={16} /> Print or save PDF</Button></div></div><div className="no-print mb-4 flex items-center gap-4 p-4 bg-muted/50 rounded-lg"><span className="text-sm font-medium">Mode:</span><div className="flex gap-2"><button onClick={() => setMode('blank')} className={cx('px-3 py-1.5 rounded-lg text-xs font-semibold', mode === 'blank' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>Blank template</button><button onClick={() => setMode('low-stock')} className={cx('px-3 py-1.5 rounded-lg text-xs font-semibold', mode === 'low-stock' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>Low stock only</button><button onClick={() => setMode('all')} className={cx('px-3 py-1.5 rounded-lg text-xs font-semibold', mode === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>All ingredients</button></div></div><div className="no-print mb-4 grid gap-4 sm:grid-cols-2"><Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field><Field label="Baker"><Input value={baker} onChange={e => setBaker(e.target.value)} placeholder="Name" /></Field><Field label="Sheet No."><Input value={sheetNumber} onChange={e => setSheetNumber(e.target.value)} placeholder="#" /></Field><Field label="Checked by"><Input value={checkedBy} onChange={e => setCheckedBy(e.target.value)} placeholder="Name" /></Field></div><StockCheckSheetDocument ingredients={store.ingredients} recipes={store.recipes} settings={store.settings} mode={mode} date={date} baker={baker} sheetNumber={sheetNumber} checkedBy={checkedBy} /></div></div>, document.body);
}

function ExcelImportModal({ store, update, onClose }: { store: Store; update: (patch: Partial<Store>) => void; onClose: () => void }) {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [invoices, setInvoices] = useState<ParsedInvoice[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const parsed = await parseExcelFile(file);
      if (parsed.length === 0) {
        setError('No invoices found in the file. Make sure each sheet has invoice data.');
        setLoading(false);
        return;
      }
      setInvoices(parsed);
      const importData = buildImportData(parsed, store.recipes, store.orders);
      setResult(importData);
      setStep('preview');
    } catch (err) {
      setError('Failed to read the Excel file. Please check the format and try again.');
    }
    setLoading(false);
  };

  const handleImport = () => {
    if (!result) return;
    // Merge recipes (add new ones, keep existing)
    const existingRecipeIds = new Set(store.recipes.map(r => r.id));
    const newRecipes = result.recipes.filter(r => !existingRecipeIds.has(r.id));
    // Merge clients
    const existingClientIds = new Set(store.clients.map(c => c.id));
    const newClients = result.clients.filter(c => !existingClientIds.has(c.id));
    // Find max invoice number
    const allNums = [...store.orders.map(o => o.invoiceNumber), ...result.orders.map(o => o.invoiceNumber)];
    const maxNum = allNums.reduce((max, num) => {
      const n = parseInt(num.replace(/\D/g, ''), 10);
      return n > max ? n : max;
    }, 0);

    update({
      recipes: [...store.recipes, ...newRecipes],
      orders: [...result.orders, ...store.orders],
      expenses: [...result.expenses, ...store.expenses],
      clients: [...store.clients, ...newClients],
      settings: { ...store.settings, nextInvoiceNumber: maxNum + 1 },
    });
    setStep('done');
  };

  return <Modal title="Import Excel invoices" subtitle="Upload your Excel file to import all invoices, products, and customers." onClose={onClose} wide>
    {step === 'upload' && <div className="space-y-4">
      <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-8 text-center" onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        <span className="mb-3 inline-flex rounded-full bg-secondary p-3 text-secondary-foreground"><Upload size={22} /></span>
        <p className="text-sm font-semibold">{loading ? 'Reading file...' : 'Click to select your Excel file'}</p>
        <p className="mt-1 text-xs text-muted-foreground">Supports .xlsx files with invoice sheets</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>}
    {step === 'preview' && result && <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Invoices</p><p className="mono mt-1 text-2xl font-semibold">{result.orders.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Recipes</p><p className="mono mt-1 text-2xl font-semibold">{result.recipes.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Customers</p><p className="mono mt-1 text-2xl font-semibold">{result.clients.length}</p></Card>
      </div>
      {result.warnings.length > 0 && <div className="rounded-lg bg-accent/20 p-3"><p className="text-xs font-semibold text-accent-foreground mb-1">Notes</p><ul className="space-y-0.5">{result.warnings.slice(0, 10).map((w, i) => <li key={i} className="text-xs text-muted-foreground">- {w}</li>)}{result.warnings.length > 10 && <li className="text-xs text-muted-foreground">... and {result.warnings.length - 10} more</li>}</ul></div>}
      <div className="rounded-lg border"><div className="border-b bg-muted/35 px-4 py-2.5"><p className="text-xs font-semibold">Invoice preview</p></div><div className="max-h-48 overflow-auto divide-y">{result.orders.slice(0, 8).map(o => { const total = calculateOrderTotal(o.items, o.discount, o.deliveryFee, o.taxRate || 0); return <div key={o.id} className="flex items-center justify-between px-4 py-2.5 text-sm"><div><p className="font-medium">{o.invoiceNumber}</p><p className="text-xs text-muted-foreground">{o.customerName}</p></div><div className="text-right"><p className="mono text-sm font-semibold">{money(total)}</p><p className="text-[10px] text-muted-foreground">{o.items.length} items</p></div></div>; })}{result.orders.length > 8 && <p className="px-4 py-2 text-xs text-muted-foreground">... and {result.orders.length - 8} more invoices</p>}</div></div>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={handleImport}><Upload size={16} /> Import {result.orders.length} invoices</Button></div>
    </div>}
    {step === 'done' && <div className="py-6 text-center">
      <span className="mb-3 inline-flex rounded-full bg-secondary p-3 text-secondary-foreground"><Check size={22} /></span>
      <h3 className="mt-2 font-semibold">Import complete</h3>
      <p className="mt-1 text-sm text-muted-foreground">All invoices, products, and customers have been added to your system.</p>
      <Button className="mt-4" onClick={onClose}>Done</Button>
    </div>}
  </Modal>;
}

function Expenses() {
  const { store, update } = useStore(); const isMobile = useIsMobile(); const [edit, setEdit] = useState<Expense | null>(null); const [location] = useLocation(); const urlSearch = useSearch();
  const add = () => setEdit({ id: id('exp'), date: today(), category: 'Ingredients', description: '', amount: 0, supplier: '', relatedOrderId: '', notes: '' });
  useEffect(() => { if (new URLSearchParams(urlSearch).get('new') === '1') { add(); clearSearchParam('new'); } }, [location, urlSearch]);
  const remove = (expense: Expense) => { if (window.confirm(`Delete ${expense.description || 'this expense'}?`)) update({ expenses: store.expenses.filter(x => x.id !== expense.id), auditLog: [createAuditEntry('Expenses', 'deleted', expense.id, expense.description, `Deleted expense: ${expense.description} (${money(expense.amount)})`), ...store.auditLog], notifications: [createNotification('Expense deleted', `${expense.description} removed`, 'Expenses', expense.id), ...store.notifications] }); };
  const saveExpense = (e: Expense) => { const exists = store.expenses.some(x => x.id === e.id); update({ expenses: exists ? store.expenses.map(x => x.id === e.id ? e : x) : [e, ...store.expenses], auditLog: [createAuditEntry('Expenses', exists ? 'updated' : 'created', e.id, e.description, `${exists ? 'Updated' : 'Created'} expense: ${e.description} (${money(e.amount)})`), ...store.auditLog], notifications: [createNotification(`Expense ${exists ? 'updated' : 'created'}`, `${e.description} — ${money(e.amount)}`, 'Expenses', e.id), ...store.notifications] }); setEdit(null); };
  if (isMobile) { return <div><div className="mb-4 flex items-center justify-between"><h1 className="display text-xl font-semibold">Expenses</h1><Button onClick={add}><Plus size={16} /> Add</Button></div><div className="mb-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ArrowUpRight size={10} /> Swipe right to edit</span><span className="flex items-center gap-1">Swipe left to delete <ArrowDownRight size={10} /></span></div><div className="space-y-2">{store.expenses.map(e => <SwipeableRow key={e.id} onEdit={() => setEdit(e)} onDelete={() => remove(e)}><Card className="p-4"><div className="flex items-center justify-between mb-1"><p className="text-sm font-semibold">{e.description}</p><p className="mono text-sm font-semibold">{money(e.amount)}</p></div><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{e.category}</span><span className="text-[10px] text-muted-foreground">{shortDate(e.date)}</span></div></div></Card></SwipeableRow>)}{!store.expenses.length && <Empty icon={Wallet} title="No expenses" detail="Start recording expenses to track your outflow." action={<Button onClick={add}>Add expense</Button>} />}</div>{edit && <ExpenseModal value={edit} onClose={() => setEdit(null)} onSave={saveExpense} />}</div>; }
  return <div><PageHeader eyebrow="Outgoings" title="Expenses" description="Keep the money leaving the bakery as visible as the money coming in." action={<Button onClick={add} data-testid="button-add-expense"><Plus size={17} /> Add expense</Button>} /><Card className="overflow-hidden">{store.expenses.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-muted/55 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3.5">Date</th><th>Description</th><th>Category</th><th>Supplier</th><th>Amount</th><th className="pr-5 text-right"> </th></tr></thead><tbody className="divide-y">{store.expenses.map(e => <tr key={e.id} className="hover:bg-muted/25"><td className="px-5 py-4 text-muted-foreground">{shortDate(e.date)}</td><td className="font-semibold">{e.description}</td><td><span className="rounded-full bg-muted px-2 py-1 text-xs">{e.category}</span></td><td>{e.supplier || '—'}</td><td className="mono">{money(e.amount)}</td><td className="pr-5 text-right"><IconButton label={`Edit ${e.description}`} onClick={() => setEdit(e)}><Pencil size={16} /></IconButton><IconButton label={`Delete ${e.description}`} onClick={() => remove(e)}><Trash2 size={16} /></IconButton></td></tr>)}</tbody></table></div> : <Empty icon={Wallet} title="No expenses recorded" detail="A clear expense trail makes your profit number trustworthy." action={<Button onClick={add}>Add expense</Button>} />}</Card>{edit && <ExpenseModal value={edit} onClose={() => setEdit(null)} onSave={saveExpense} />}</div>;
}
function ExpenseModal({ value, onClose, onSave }: { value: Expense; onClose: () => void; onSave: (v: Expense) => void }) { const [e, setE] = useState(value); const set = (k: keyof Expense, v: string | number) => setE(x => ({ ...x, [k]: v })); return <Modal title={value.description ? 'Edit expense' : 'New expense'} onClose={onClose}><form onSubmit={ev => { ev.preventDefault(); onSave(e); }} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Date"><Input type="date" value={e.date} onChange={x => set('date', x.target.value)} /></Field><Field label="Category"><Select value={e.category} onChange={x => set('category', x.target.value)}><option>Ingredients</option><option>Packaging</option><option>Utilities</option><option>Transport</option><option>Equipment</option><option>Other</option></Select></Field><Field label="Description"><Input required value={e.description} onChange={x => set('description', x.target.value)} /></Field><Field label="Amount"><Input required type="number" min="0" step=".01" value={e.amount} onChange={x => set('amount', Number(x.target.value))} /></Field><Field label="Supplier"><Input value={e.supplier} onChange={x => set('supplier', x.target.value)} /></Field></div><Field label="Notes"><textarea className="min-h-20 w-full rounded-lg border bg-background p-3 text-sm" value={e.notes} onChange={x => set('notes', x.target.value)} /></Field><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save expense</Button></div></form></Modal>; }

function Inventory() {
  const { store, update } = useStore(); const isMobile = useIsMobile(); const [edit, setEdit] = useState<InventoryTransaction | null>(null); const [location] = useLocation(); const urlSearch = useSearch();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => { try { const saved = localStorage.getItem('inventory-expanded'); return saved ? JSON.parse(saved) : {}; } catch { return {}; } });
  const [pinned, setPinned] = useState<Record<string, boolean>>(() => { try { const saved = localStorage.getItem('inventory-pinned'); return saved ? JSON.parse(saved) : {}; } catch { return {}; } });
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showStockCheck, setShowStockCheck] = useState(false);
  const reservedByIngredient = useMemo(() => reservedQuantityByIngredient(store.reservations), [store.reservations]);
  const heldFor = (i: Ingredient) => reservedByIngredient[i.id] || 0;
  const heldCount = reservedBatchCount(store.reservations);
  const heldValue = roundCurrency(store.ingredients.reduce((s, i) => s + (unitCost(i) || 0) * heldFor(i), 0));
  const freeValue = roundCurrency(store.ingredients.reduce((s, i) => s + (unitCost(i) || 0) * availableStock(i, reservedByIngredient), 0));
  const add = (type: string) => setEdit({ id: id('txn'), ingredientId: store.ingredients[0]?.id || '', type, quantity: 0, date: today(), note: '' });
  useEffect(() => { if (new URLSearchParams(urlSearch).get('new') === '1') { add('receive'); clearSearchParam('new'); } }, [location, urlSearch]);
  const save = (t: InventoryTransaction) => { const ingredient = store.ingredients.find(i => i.id === t.ingredientId); if (!ingredient) return; const newStock = t.type === 'set' ? Math.max(0, t.quantity) : Math.max(0, ingredient.currentStock + (t.type === 'waste' || t.type === 'use' ? -1 : 1) * t.quantity); const minStock = t.minimumStock !== undefined ? t.minimumStock : ingredient.minimumStock; update({ ingredients: store.ingredients.map(i => i.id === t.ingredientId ? { ...i, currentStock: newStock, minimumStock: minStock } : i), transactions: [t, ...store.transactions], auditLog: [createAuditEntry('Inventory', t.type, t.ingredientId, ingredient.name, t.type === 'set' ? `Set ${ingredient.name} stock to ${t.quantity} ${ingredient.unit}` : `${t.type} ${t.quantity} ${ingredient.unit} of ${ingredient.name}`), ...store.auditLog], notifications: [createNotification(`Stock ${t.type}`, t.type === 'set' ? `${ingredient.name} set to ${t.quantity} ${ingredient.unit}` : `${t.quantity} ${ingredient.unit} of ${ingredient.name} ${t.type === 'waste' ? 'wasted' : 'received'}`, 'Inventory', t.ingredientId), ...store.notifications] }); setEdit(null); };
  const categories = [...new Set(store.ingredients.map(i => i.category))].sort();
  const filteredByCategory = categories.map(cat => {
    const items = store.ingredients.filter(i => i.category === cat && (i.name.toLowerCase().includes(search.toLowerCase()) || i.supplier.toLowerCase().includes(search.toLowerCase()) || cat.toLowerCase().includes(search.toLowerCase())));
    return { category: cat, items };
  }).filter(c => c.items.length > 0);
  const toggleCategory = (cat: string) => setExpanded(prev => {
    const isCurrentlyOpen = prev[cat];
    const next: Record<string, boolean> = {};
    if (!isCurrentlyOpen) { Object.keys(prev).forEach(k => { if (pinned[k]) next[k] = true; }); next[cat] = true; }
    else { Object.keys(prev).forEach(k => { if (pinned[k] && k !== cat) next[k] = true; }); }
    try { localStorage.setItem('inventory-expanded', JSON.stringify(next)); } catch {} return next;
  });
  const togglePin = (cat: string) => setPinned(prev => { const next = { ...prev, [cat]: !prev[cat] }; try { localStorage.setItem('inventory-pinned', JSON.stringify(next)); } catch {} return next; });
  if (isMobile) {
    return <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="display text-xl font-semibold">Inventory</h1>
        <div className="flex gap-2">
          <Button variant="soft" onClick={() => add('waste')} className="min-h-8 px-2.5 text-xs"><ArrowDownRight size={14} /> Waste</Button>
          <Button onClick={() => add('receive')} className="min-h-8 px-2.5 text-xs"><Plus size={14} /> Receive</Button>
          <Button variant="ghost" onClick={() => setShowShoppingList(true)} className="min-h-8 px-2.5 text-xs"><FileText size={14} /></Button>
          <Button variant="ghost" onClick={() => setShowStockCheck(true)} className="min-h-8 px-2.5 text-xs"><ClipboardList size={14} /></Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="p-3"><p className="text-[10px] text-muted-foreground">Stock value</p><p className="mono mt-1 text-lg font-semibold">{money(roundCurrency(store.ingredients.reduce((s, i) => s + (unitCost(i) || 0) * i.currentStock, 0)))}</p></Card>
        <Card className="p-3"><p className="text-[10px] text-muted-foreground">Needs attention</p><p className="mono mt-1 text-lg font-semibold text-primary">{store.ingredients.filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock).length}</p></Card>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients..." className="pl-9" />
      </div>
      <div className="space-y-3">
        {filteredByCategory.map(({ category, items }) => {
          const isOpen = expanded[category] === true;
          const catLow = items.filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock).length;
          const catValue = roundCurrency(items.reduce((s, i) => s + (unitCost(i) || 0) * i.currentStock, 0));
          return <Card key={category} className="overflow-hidden">
            <button onClick={() => toggleCategory(category)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Box size={16} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{category}</p>
                <p className="text-[10px] text-muted-foreground">{items.length} items · {money(catValue)}</p>
              </div>
              {catLow > 0 && <span className="mr-2 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">{catLow} low</span>}
              <button type="button" onClick={e => { e.stopPropagation(); togglePin(category); }} className="p-1 rounded hover:bg-muted/50"><Pin size={14} className={cx(pinned[category] ? 'text-primary fill-primary/20' : 'text-muted-foreground')} /></button>
              <ChevronRight size={16} className={cx('text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
            </button>
            {isOpen && <div className="divide-y border-t">
              {items.map(i => {
                const low = i.minimumStock > 0 && i.currentStock <= i.minimumStock;
                const uc = unitCost(i);
                const held = heldFor(i);
                return <div key={i.id} className="flex items-center gap-3 px-4 py-3" onClick={() => setEdit({ id: id('txn'), ingredientId: i.id, type: 'set', quantity: i.currentStock, date: today(), note: '' })}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{i.name}</p>
                      {low && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{i.supplier || 'No supplier'}{uc ? ` · ${money(uc)}/${i.unit}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="mono text-sm">{i.currentStock.toLocaleString()} {i.unit}</p>
                    {low && <p className="text-[10px] text-destructive">min {i.minimumStock}</p>}
                    {held > 0 && <p className="text-[10px] text-emerald-700">{availableStock(i, reservedByIngredient).toLocaleString()} free</p>}
                  </div>
                </div>;
              })}
            </div>}
          </Card>;
        })}
      </div>
      {!filteredByCategory.length && <Empty icon={Box} title="No ingredients found" detail={search ? `No results for "${search}"` : "Add ingredients to start tracking inventory."} />}
      {edit && <InventoryModal value={edit} ingredients={store.ingredients} onClose={() => setEdit(null)} onSave={save} />}
      {showShoppingList && <ShoppingListModal store={store} onClose={() => setShowShoppingList(false)} />}
      {showStockCheck && <StockCheckSheetModal store={store} onClose={() => setShowStockCheck(false)} />}
    </div>;
  }
  return <div>
    <PageHeader eyebrow="Pantry floor" title="Inventory" description="Know what is on hand before the first tray goes in." action={
      <div className="flex gap-2">
        <Button variant="soft" onClick={() => add('waste')}><ArrowDownRight size={16} /> Record waste</Button>
        <Button onClick={() => add('receive')}><Plus size={16} /> Receive stock</Button>
        <Button variant="ghost" onClick={() => setShowShoppingList(true)}><FileText size={16} /> Shopping List</Button>
        <Button variant="ghost" onClick={() => setShowStockCheck(true)}><ClipboardList size={16} /> Stock Check</Button>
      </div>
    } />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <Card className="p-4"><p className="text-xs text-muted-foreground">Stock value</p><p className="mono mt-2 text-2xl font-semibold">{money(roundCurrency(store.ingredients.reduce((s, i) => s + (unitCost(i) || 0) * i.currentStock, 0)))}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Tracked ingredients</p><p className="mono mt-2 text-2xl font-semibold">{store.ingredients.length}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Needs attention</p><p className="mono mt-2 text-2xl font-semibold text-primary">{store.ingredients.filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock).length}</p></Card>
    </div>
    <Card className="mb-4 p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-900"><Lock size={15} /></span>
          <div><p className="text-[10px] text-muted-foreground">Held for unbaked batches</p><p className="mono text-sm font-semibold">{heldCount} batch{heldCount !== 1 ? 'es' : ''} · {money(heldValue)}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900"><Check size={15} /></span>
          <div><p className="text-[10px] text-muted-foreground">Free to promise</p><p className="mono text-sm font-semibold">{money(freeValue)}</p></div>
        </div>
        <p className="flex-1 text-[10px] leading-relaxed text-muted-foreground">Ingredients stay on hand until you mark a batch as baked — until then they are counted as held so the same flour cannot be promised twice.</p>
      </div>
    </Card>
    <div className="mb-5 flex items-center gap-3">
      <div className="relative max-w-sm flex-1">
        <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
        <Input data-testid="input-search-inventory" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients or categories..." className="pl-9" />
      </div>
      {search && <Button variant="ghost" onClick={() => setSearch('')} className="text-xs"><X size={14} /> Clear</Button>}
    </div>
    <div className="space-y-4">
      {filteredByCategory.map(({ category, items }) => {
        const isOpen = expanded[category] === true;
        const catLow = items.filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock).length;
        const catValue = roundCurrency(items.reduce((s, i) => s + (unitCost(i) || 0) * i.currentStock, 0));
        const uc = (i: Ingredient) => unitCost(i);
        return <Card key={category} className="overflow-hidden">
          <button onClick={() => toggleCategory(category)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Box size={18} /></span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{category}</p>
              <p className="text-xs text-muted-foreground">{items.length} items · {money(catValue)}</p>
            </div>
            {catLow > 0 && <span className="mr-2 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">{catLow} low</span>}
            <button type="button" onClick={e => { e.stopPropagation(); togglePin(category); }} className="p-1.5 rounded hover:bg-muted/50"><Pin size={16} className={cx(pinned[category] ? 'text-primary fill-primary/20' : 'text-muted-foreground')} /></button>
            <ChevronRight size={18} className={cx('text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
          </button>
          {isOpen && <div className="divide-y border-t">
            {items.map(i => {
              const low = i.minimumStock > 0 && i.currentStock <= i.minimumStock;
              const u = uc(i);
              const held = heldFor(i);
              return <div key={i.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/25 cursor-pointer" onClick={() => setEdit({ id: id('txn'), ingredientId: i.id, type: 'set', quantity: i.currentStock, date: today(), note: '' })}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{i.name}</p>
                    {low && <span className="h-2 w-2 rounded-full bg-destructive" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{i.supplier || 'No supplier'}{u ? ` · ${money(u)}/${i.unit}` : ''}</p>
                </div>
                {held > 0 && <div className="hidden text-right sm:block"><p className="text-[10px] text-blue-900">held for baking</p><p className="mono text-xs font-semibold text-blue-900">{held.toLocaleString()} {i.unit}</p></div>}
                <div className="text-right">
                  <p className="mono text-sm font-semibold">{i.currentStock.toLocaleString()} {i.unit}</p>
                  {low && <p className="text-xs text-destructive">min {i.minimumStock}</p>}
                  {held > 0 && <p className="text-[10px] text-emerald-700">{availableStock(i, reservedByIngredient).toLocaleString()} free</p>}
                </div>
              </div>;
            })}
          </div>}
        </Card>;
      })}
    </div>
    {!filteredByCategory.length && <Empty icon={Box} title="No ingredients found" detail={search ? `No results for "${search}"` : "Add ingredients to start tracking inventory."} />}
    {edit && <InventoryModal value={edit} ingredients={store.ingredients} onClose={() => setEdit(null)} onSave={save} />}
    {showShoppingList && <ShoppingListModal store={store} onClose={() => setShowShoppingList(false)} />}
    {showStockCheck && <StockCheckSheetModal store={store} onClose={() => setShowStockCheck(false)} />}
  </div>;
}
function InventoryModal({ value, ingredients, onClose, onSave }: { value: InventoryTransaction; ingredients: Ingredient[]; onClose: () => void; onSave: (v: InventoryTransaction) => void }) {
  const [t, setT] = useState(value);
  const [qtyStr, setQtyStr] = useState(String(value.quantity || ''));
  const ingredient = ingredients.find(i => i.id === t.ingredientId);
  const currentStock = ingredient?.currentStock || 0;
  const unit = ingredient?.unit || 'g';
  const parsedQty = Number(qtyStr) || 0;
  const [minStockStr, setMinStockStr] = useState(String(ingredient?.minimumStock || 0));

  let preview = currentStock;
  if (t.type === 'set') { preview = parsedQty; }
  else if (t.type === 'receive') { preview = currentStock + parsedQty; }
  else if (t.type === 'waste') { preview = Math.max(0, currentStock - parsedQty); }

  const handleSave = () => {
    const minStock = Number(minStockStr) || 0;
    onSave({ ...t, quantity: parsedQty, minimumStock: minStock });
  };

  return <Modal title="Update stock" onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); if (parsedQty <= 0 && t.type !== 'set') return; handleSave(); }} className="space-y-4">
      <Field label="Ingredient"><Select value={t.ingredientId} onChange={e => { setT({ ...t, ingredientId: e.target.value }); const ing = ingredients.find(i => i.id === e.target.value); if (ing) setMinStockStr(String(ing.minimumStock || 0)); }}>{ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>)}</Select></Field>
      <div className="flex gap-2">
        {[{ type: 'set', label: 'Set new level', desc: 'Type the exact amount you have' }, { type: 'receive', label: 'Received', desc: 'Adding to stock' }, { type: 'waste', label: 'Used / Waste', desc: 'Removing from stock' }].map(o => <button key={o.type} type="button" onClick={() => setT({ ...t, type: o.type })} className={cx('flex-1 rounded-lg border p-2.5 text-left', t.type === o.type ? 'border-primary bg-primary/5' : 'hover:bg-muted')}><p className="text-xs font-semibold">{o.label}</p><p className="text-[10px] text-muted-foreground">{o.desc}</p></button>)}
      </div>
      <Field label={t.type === 'set' ? 'New stock level' : 'Quantity'}>
        <div className="relative">
          <Input autoFocus type="text" inputMode="decimal" value={qtyStr} onChange={e => setQtyStr(e.target.value)} onFocus={e => e.target.select()} placeholder="0" className="text-lg mono pr-12" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">{unit}</span>
        </div>
      </Field>
      {parsedQty > 0 && <div className="rounded-lg bg-muted/50 px-4 py-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">{currentStock} {unit} →</span><span className={cx('mono text-sm font-semibold', preview !== currentStock ? 'text-primary' : '')}>{preview} {unit}</span></div>}
      <Field label="Minimum stock level" hint="Alert when stock falls below this">
        <div className="relative">
          <Input type="text" inputMode="decimal" value={minStockStr} onChange={e => setMinStockStr(e.target.value)} placeholder="0" className="mono pr-12" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">{unit}</span>
        </div>
      </Field>
      <Field label="Date"><Input type="date" value={t.date} onChange={e => setT({ ...t, date: e.target.value })} /></Field>
      <Field label="Note"><Input value={t.note} onChange={e => setT({ ...t, note: e.target.value })} placeholder="Optional — why the change?" /></Field>
      <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">{t.type === 'set' ? 'Set stock' : t.type === 'receive' ? 'Add stock' : 'Record usage'}</Button></div>
    </form>
  </Modal>;
}

function Reports() {
  const { store } = useStore(); const isMobile = useIsMobile(); const [period, setPeriod] = useState<RevenuePeriod>('month');
  const periodLabel = revenuePeriodLabel(period);
  const revOrders = revenueOrders(store.orders, period);
  const revExpenses = store.expenses.filter(e => inRevenuePeriod(e.date, period));
  const revenue = revOrders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0) - o.discount, 0);
  const costs = revOrders.reduce((s, o) => s + calculateOrderCost(o.items), 0);
  const expenses = revExpenses.reduce((s, e) => s + e.amount, 0);
  const download = (filename: string, content: string) => { const blob = new Blob([content], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };
  if (isMobile) { return <div><div className="mb-4 flex items-center justify-between"><h1 className="display text-xl font-semibold">Reports</h1><Button variant="soft" onClick={() => download('little-bliss-orders.csv', `order,customer,total,status\n${store.orders.filter(o => !o.excludeFromRevenue).map(o => `${o.orderNumber},${o.customerName},${calculateOrderTotal(o.items, o.discount, o.deliveryFee, o.taxRate || 0)},${o.paymentStatus}`).join('\n')}`)}><Download size={14} /> CSV</Button></div><div className="mb-3 flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1">{REVENUE_PERIODS.map(p => <button key={p.value} onClick={() => setPeriod(p.value)} className={cx('rounded-md px-2.5 py-1.5 text-[11px] font-semibold', period === p.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{p.label}</button>)}</div><div className="grid grid-cols-2 gap-3 mb-4"><Card className="p-4"><p className="text-[10px] text-muted-foreground">Revenue</p><p className="mono mt-1 text-lg font-semibold">{money(revenue)}</p></Card><Card className="p-4"><p className="text-[10px] text-muted-foreground">Costs</p><p className="mono mt-1 text-lg font-semibold">{money(costs)}</p></Card><Card className="p-4"><p className="text-[10px] text-muted-foreground">Expenses</p><p className="mono mt-1 text-lg font-semibold">{money(expenses)}</p></Card><Card className="p-4"><p className="text-[10px] text-muted-foreground">Profit</p><p className={cx('mono mt-1 text-lg font-semibold', revenue - costs - expenses < 0 && 'text-destructive')}>{money(revenue - costs - expenses)}</p></Card></div><Card className="p-4"><h2 className="text-sm font-semibold mb-3">Top products</h2><div className="space-y-2.5">{store.recipes.map(p => { const units = revOrders.reduce((s, o) => s + o.items.filter(i => i.productId === p.id).reduce((a, i) => a + i.quantity, 0), 0); const val = revOrders.reduce((s, o) => s + o.items.filter(i => i.productId === p.id).reduce((a, i) => a + i.quantity * i.unitPrice, 0), 0); return <div key={p.id} className="flex items-center justify-between"><span className="text-sm">{p.name}</span><div className="text-right"><p className="mono text-xs font-semibold">{units} units</p><p className="text-[10px] text-muted-foreground">{money(val)}</p></div></div>; })}</div></Card></div>; }
  return <div><PageHeader eyebrow="Numbers with context" title="Reports" description="A weekly rhythm for seeing what is working and what to change." action={<Button variant="soft" onClick={() => download('little-bliss-orders.csv', `order,customer,total,status\n${store.orders.filter(o => !o.excludeFromRevenue).map(o => `${o.orderNumber},${o.customerName},${calculateOrderTotal(o.items, o.discount, o.deliveryFee, o.taxRate || 0)},${o.paymentStatus}`).join('\n')}`)}><Download size={16} /> Export CSV</Button>} /><div className="mb-5 flex items-center gap-1 rounded-lg border bg-card p-1 w-fit">{REVENUE_PERIODS.map(p => <button key={p.value} data-testid={`button-period-${p.value}`} onClick={() => setPeriod(p.value)} className={cx('rounded-md px-3 py-1.5 text-xs font-semibold', period === p.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>{p.label}</button>)}</div><div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{periodLabel} revenue</p><p className="mono mt-2 text-3xl font-semibold">{money(revenue)}</p></div><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{revOrders.length} order{revOrders.length !== 1 ? 's' : ''}</span></div></Card><Card className="p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Profitability snapshot</h2><p className="text-xs text-muted-foreground">Estimated margin per product</p></div></div>                <div className="space-y-3">{store.recipes.map(p => { const c = costPerDozen(p, store.ingredients); const profit = roundCurrency(p.retailPriceDozen - c); return <div key={p.id} className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">{store.recipes.indexOf(p) + 1}</span><div><p className="text-sm font-semibold">{p.name}</p><p className="text-[10px] text-muted-foreground">cost {c ? money(c) : '—'}</p></div></div><div className="text-right"><p className="mono text-sm font-semibold text-primary">{c ? money(profit) : '—'}</p><p className="text-[10px] text-muted-foreground">{c ? `${Math.round((profit / p.retailPriceDozen) * 100)}% margin` : 'no cost data'}</p></div></div>; })}</div></Card></div></div>;
}
function ReportLine({ label, value, total, color }: { label: string; value: number; total: number; color: string }) { return <div><div className="mb-1.5 flex justify-between text-xs"><span>{label}</span><span className="mono">{money(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cx('h-full rounded-full', color)} style={{ width: `${Math.min(100, value / total * 100)}%` }} /></div></div>; }

function Budget() {
  const { store, update } = useStore(); const isMobile = useIsMobile(); const [edit, setEdit] = useState<BudgetAllocation | null>(null); const [deletingAlloc, setDeletingAlloc] = useState<BudgetAllocation | null>(null); const [deleteStep, setDeleteStep] = useState(0);
  const now = new Date(); const cm = now.getMonth(); const cy = now.getFullYear();
  const isCurrentMonth = (dateStr: string) => { const d = new Date(dateStr); return d.getMonth() === cm && d.getFullYear() === cy; };
  const received = store.orders.filter(o => !o.excludeFromRevenue && isCurrentMonth(o.orderDate)).reduce((s, o) => s + o.amountPaid, 0);
  const expenses = store.expenses.filter(e => isCurrentMonth(e.date)).reduce((s, e) => s + e.amount, 0);
  const available = roundCurrency(received - expenses);
  const allocated = store.allocations.reduce((s, a) => s + (a.mode === 'percent' ? available * a.value / 100 : a.value), 0);
  const saveAlloc = (a: BudgetAllocation) => { update({ allocations: store.allocations.map(x => x.id === a.id ? a : x).concat(store.allocations.some(x => x.id === a.id) ? [] : [a]), auditLog: [createAuditEntry('Budget', store.allocations.some(x => x.id === a.id) ? 'updated' : 'created', a.id, a.name, `${store.allocations.some(x => x.id === a.id) ? 'Updated' : 'Created'} allocation: ${a.name}`), ...store.auditLog] }); setEdit(null); };
  const removeAlloc = (a: BudgetAllocation) => { setDeletingAlloc(a); setDeleteStep(1); };
  const confirmDeleteStep1 = () => setDeleteStep(2);
  const confirmDeleteStep2 = () => { if (!deletingAlloc) return; update({ allocations: store.allocations.filter(x => x.id !== deletingAlloc.id), auditLog: [createAuditEntry('Budget', 'deleted', deletingAlloc.id, deletingAlloc.name, `Deleted allocation: ${deletingAlloc.name}`), ...store.auditLog] }); setDeletingAlloc(null); setDeleteStep(0); };
  const cancelDelete = () => { setDeletingAlloc(null); setDeleteStep(0); };
  if (isMobile) { return <div><div className="mb-4 flex items-center justify-between"><h1 className="display text-xl font-semibold">Budget</h1><Button onClick={() => setEdit({ id: id('alloc'), name: '', mode: 'percent', value: 0 })}><Plus size={16} /> Add</Button></div><div className="grid grid-cols-3 gap-2 mb-4"><Card className="p-3 bg-sidebar text-sidebar-foreground"><p className="text-[10px] opacity-65">Available</p><p className="mono mt-1 text-lg font-semibold">{money(available)}</p></Card><Card className="p-3"><p className="text-[10px] text-muted-foreground">Allocated</p><p className="mono mt-1 text-lg font-semibold">{money(allocated)}</p></Card><Card className="p-3"><p className="text-[10px] text-muted-foreground">Remaining</p><p className={cx('mono mt-1 text-lg font-semibold', available - allocated < 0 && 'text-destructive')}>{money(available - allocated)}</p></Card></div><div className="mb-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ArrowUpRight size={10} /> Swipe right to edit</span><span className="flex items-center gap-1">Swipe left to delete <ArrowDownRight size={10} /></span></div><div className="space-y-2">{store.allocations.map(a => { const amount = a.mode === 'percent' ? available * a.value / 100 : a.value; return <SwipeableRow key={a.id} onEdit={() => setEdit(a)} onDelete={() => removeAlloc(a)}><Card className="p-4 flex items-center justify-between"><div><p className="text-sm font-semibold">{a.name}</p><p className="text-[10px] text-muted-foreground">{a.mode === 'percent' ? `${a.value}%` : 'Fixed'}</p></div><div className="flex items-center gap-2"><p className="mono text-sm font-semibold">{money(amount)}</p></div></Card></SwipeableRow>; })}{!store.allocations.length && <Empty icon={CircleDollarSign} title="No allocations" detail="Plan how your cash gets used." />}</div>{edit && <BudgetModal value={edit} onClose={() => setEdit(null)} onSave={saveAlloc} />}{deletingAlloc && <Modal title="Delete allocation" onClose={cancelDelete}><div className="space-y-4"><p className="text-sm text-muted-foreground">{deleteStep === 1 ? <>Are you sure you want to delete <strong>{deletingAlloc.name}</strong>?</> : <><strong>This cannot be undone.</strong> Type <span className="font-semibold">DELETE</span> to confirm.</>}</p>{deleteStep === 2 && <Input autoFocus placeholder="Type DELETE to confirm" onChange={e => { if (e.target.value === 'DELETE') confirmDeleteStep2(); }} />}<div className="flex justify-end gap-2"><Button variant="ghost" onClick={cancelDelete}>Cancel</Button>{deleteStep === 1 && <Button variant="danger" onClick={confirmDeleteStep1}>Delete</Button>}</div></div></Modal>}</div>; }
  return <div><PageHeader eyebrow="Cash plan" title="Budget" description="Give every pula a job, without losing sight of what is available." action={<Button onClick={() => setEdit({ id: id('alloc'), name: '', mode: 'percent', value: 0 })}><Plus size={17} /> Add allocation</Button>} /><div className="grid gap-4 sm:grid-cols-3"><Card className="bg-sidebar p-5 text-sidebar-foreground"><p className="text-xs opacity-65">Available cash</p><p className="mono mt-3 text-3xl font-semibold">{money(available)}</p><p className="mt-2 text-xs opacity-65">received less actual expenses</p></Card><Card className="p-5"><p className="text-xs text-muted-foreground">Allocated</p><p className="mono mt-3 text-3xl font-semibold">{money(allocated)}</p><p className="mt-2 text-xs text-muted-foreground">{allocated > available ? 'Over your available cash' : 'planned across allocations'}</p></Card><Card className="p-5"><p className="text-xs text-muted-foreground">Remaining</p><p className={cx('mono mt-3 text-3xl font-semibold', available - allocated < 0 && 'text-destructive')}>{money(available - allocated)}</p><p className="mt-2 text-xs text-muted-foreground">{available - allocated < 0 ? 'Review your plan' : 'still unassigned'}</p></Card></div><Card className="mt-5 overflow-hidden"><div className="border-b px-5 py-4"><h2 className="font-semibold">Allocation plan</h2><p className="mt-0.5 text-xs text-muted-foreground">Percent allocations flex with your cash; fixed allocations stay fixed.</p></div>{store.allocations.length ? <div className="divide-y">{store.allocations.map(a => { const amount = a.mode === 'percent' ? available * a.value / 100 : a.value; return <div key={a.id} className="flex items-center gap-4 px-5 py-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"><Wallet size={16} /></div><div className="min-w-0 flex-1"><p className="font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">{a.mode === 'percent' ? `${a.value}% of available` : 'Fixed amount'}</p></div><p className="mono font-semibold">{money(amount)}</p><IconButton label={`Edit ${a.name}`} onClick={() => setEdit(a)}><Pencil size={16} /></IconButton><IconButton label={`Delete ${a.name}`} onClick={() => update({ allocations: store.allocations.filter(x => x.id !== a.id) })}><Trash2 size={16} /></IconButton></div>; })}</div> : <Empty icon={CircleDollarSign} title="No allocations yet" detail="Plan where your cash goes." action={<Button onClick={() => setEdit({ id: id('alloc'), name: '', mode: 'percent', value: 0 })}>Add allocation</Button>} />}</Card>{edit && <BudgetModal value={edit} onClose={() => setEdit(null)} onSave={saveAlloc} />}</div>;
}
function BudgetModal({ value, onClose, onSave }: { value: BudgetAllocation; onClose: () => void; onSave: (v: BudgetAllocation) => void }) { const [a, setA] = useState(value); return <Modal title={value.name ? 'Edit allocation' : 'New allocation'} onClose={onClose}><form onSubmit={e => { e.preventDefault(); onSave(a); }} className="space-y-4"><Field label="Name"><Input required value={a.name} onChange={e => setA({ ...a, name: e.target.value })} placeholder="e.g. Ingredients" /></Field><Field label="Mode"><Select value={a.mode} onChange={e => setA({ ...a, mode: e.target.value })}><option value="percent">Percent of available</option><option value="fixed">Fixed amount</option></Select></Field><Field label={a.mode === 'percent' ? 'Percentage' : 'Amount'}><Input type="number" min="0" step=".01" value={a.value} onChange={e => setA({ ...a, value: Number(e.target.value) })} /></Field><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save allocation</Button></div></form></Modal>; }

function Clients() {
  const { store, update } = useStore();
  const isMobile = useIsMobile();
  const [edit, setEdit] = useState<Client | null>(null);
  const [search, setSearch] = useState('');
  const [filterLetter, setFilterLetter] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');
  const rows = store.clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.city.toLowerCase().includes(search.toLowerCase());
    const matchesLetter = !filterLetter || c.name.toUpperCase().startsWith(filterLetter);
    const matchesStatus = filterStatus === 'all' || (c.status || 'active') === filterStatus;
    return matchesSearch && matchesLetter && matchesStatus;
  });
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const usedLetters = [...new Set(store.clients.map(c => c.name[0]?.toUpperCase()))].sort();
  const saveClient = (c: Client) => {
    const exists = store.clients.some(x => x.id === c.id);
    update({ clients: exists ? store.clients.map(x => x.id === c.id ? c : x) : [c, ...store.clients] });
    setEdit(null);
  };
  const removeClient = (c: Client) => {
    if (window.confirm(`Delete ${c.name}?`)) update({ clients: store.clients.filter(x => x.id !== c.id) });
  };
  if (isMobile) { return <div><div className="mb-4 flex items-center justify-between"><h1 className="display text-xl font-semibold">Clients</h1><Button onClick={() => setEdit({ id: id('cli'), name: '', address: '', city: '', phone: '', email: '', notes: '', createdAt: new Date().toISOString(), status: 'active' })}><Plus size={16} /> Add</Button></div><div className="relative mb-4"><Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="pl-9" /></div><div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">{([['all', 'All'], ['active', 'Active'], ['pending', 'Pending']] as const).map(([key, label]) => <button key={key} onClick={() => setFilterStatus(key)} className={cx('shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', filterStatus === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>{label}</button>)}</div><div className="mb-3 flex flex-wrap gap-1">{alphabet.map(l => <button key={l} onClick={() => setFilterLetter(filterLetter === l ? '' : l)} className={cx('h-7 w-7 rounded text-xs font-semibold transition-colors', filterLetter === l ? 'bg-primary text-primary-foreground' : usedLetters.includes(l) ? 'bg-muted text-foreground' : 'text-muted-foreground/40')}>{l}</button>)}</div><div className="mb-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><ArrowUpRight size={10} /> Swipe right to edit</span><span className="flex items-center gap-1">Swipe left to delete <ArrowDownRight size={10} /></span></div><div className="space-y-2">{rows.map(c => <SwipeableRow key={c.id} onEdit={() => setEdit(c)} onDelete={() => removeClient(c)}><Card className="p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">{c.name.split(' ').map(x => x[0]).join('').slice(0, 2)}</span><div className="min-w-0 flex-1"><p className="font-semibold text-sm">{c.name}</p><p className="text-[10px] text-muted-foreground">{[c.address, c.city].filter(Boolean).join(', ') || 'No address'}{c.phone ? ` · ${c.phone}` : ''}</p></div>{(c.status || 'active') === 'pending' && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">Pending</span>}</div></Card></SwipeableRow>)}{!rows.length && <Empty icon={Users} title="No clients yet" detail="Clients are saved automatically when you create orders." />}</div>{edit && <ClientModal value={edit} onClose={() => setEdit(null)} onSave={saveClient} />}</div>; }
  return <div>
    <PageHeader eyebrow="Contacts" title="Clients" description="Saved customer details for quick invoice filling." action={<Button onClick={() => setEdit({ id: id('cli'), name: '', address: '', city: '', phone: '', email: '', notes: '', createdAt: new Date().toISOString(), status: 'active' })}><Plus size={17} /> Add client</Button>} />
    <div className="mb-4 flex items-center gap-3">
      <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-3 text-muted-foreground" size={16} /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="pl-9" /></div>
    </div>
    <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">{([['all', 'All'], ['active', 'Active'], ['pending', 'Pending']] as const).map(([key, label]) => <button key={key} onClick={() => setFilterStatus(key)} className={cx('shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-colors', filterStatus === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>{label}</button>)}</div>
    <div className="mb-4 flex flex-wrap gap-1">
      {alphabet.map(l => <button key={l} onClick={() => setFilterLetter(filterLetter === l ? '' : l)} className={cx('h-7 w-7 rounded text-xs font-semibold transition-colors', filterLetter === l ? 'bg-primary text-primary-foreground' : usedLetters.includes(l) ? 'bg-muted text-foreground hover:bg-muted/80' : 'text-muted-foreground/40 cursor-default')}>{l}</button>)}
    </div>
    <Card className="overflow-hidden">{rows.length ? <div className="divide-y">{rows.map(c => <div key={c.id} className="flex items-center gap-4 px-5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">{c.name.split(' ').map(x => x[0]).join('').slice(0, 2)}</span>
      <div className="min-w-0 flex-1"><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{[c.address, c.city].filter(Boolean).join(', ') || 'No address'}{c.phone ? ` · ${c.phone}` : ''}</p></div>
      {(c.status || 'active') === 'pending' && <span className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent-foreground">Pending</span>}
      <div className="flex gap-1.5"><IconButton label={`Edit ${c.name}`} onClick={() => setEdit(c)}><Pencil size={16} /></IconButton><IconButton label={`Delete ${c.name}`} onClick={() => removeClient(c)}><Trash2 size={16} /></IconButton></div>
    </div>)}</div> : <Empty icon={Users} title="No clients yet" detail="Clients are saved automatically when you create orders." />}
    </Card>
    {edit && <ClientModal value={edit} onClose={() => setEdit(null)} onSave={saveClient} />}
  </div>;
}

function CustomerAnalytics() {
  const { store } = useStore();
  const isMobile = useIsMobile();
  const customerStats = getCustomerAnalytics(store.orders, store.clients);
  
  if (isMobile) {
    return <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="display text-xl font-semibold">Customer Analytics</h1>
      </div>
      <div className="space-y-4">
        {customerStats.length > 0 ? (
          customerStats.slice(0, 10).map((stat, index) => (
            <Card key={stat.customerName} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm">{stat.customerName}</p>
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Total Orders</p>
                  <p className="mono text-lg font-semibold">{stat.totalOrders}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Spent</p>
                  <p className="mono text-lg font-semibold">{money(stat.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Order</p>
                  <p className="mono text-lg font-semibold">{money(stat.avgOrderValue)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Frequency</p>
                  <p className="mono text-lg font-semibold">{stat.purchaseFrequency > 0 ? `${stat.purchaseFrequency}d` : '—'}</p>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Empty icon={Users} title="No customer data yet" detail="Customer analytics will appear once you have orders." />
        )}
      </div>
    </div>;
  }

  return <div>
    <PageHeader 
      eyebrow="Insights" 
      title="Customer Analytics" 
      description="Understand your customers' purchasing patterns and value." 
    />
    <div className="grid gap-4 xl:grid-cols-4 mb-6">
      <Card className="p-5">
        <p className="text-xs text-muted-foreground">Total Customers</p>
        <p className="mono mt-2 text-3xl font-semibold">{customerStats.length}</p>
      </Card>
      <Card className="p-5">
        <p className="text-xs text-muted-foreground">Total Revenue</p>
        <p className="mono mt-2 text-3xl font-semibold">{money(customerStats.reduce((sum, c) => sum + c.totalSpent, 0))}</p>
      </Card>
      <Card className="p-5">
        <p className="text-xs text-muted-foreground">Avg Order Value</p>
        <p className="mono mt-2 text-3xl font-semibold">{money(customerStats.length > 0 ? customerStats.reduce((sum, c) => sum + c.avgOrderValue, 0) / customerStats.length : 0)}</p>
      </Card>
      <Card className="p-5">
        <p className="text-xs text-muted-foreground">Active Customers</p>
        <p className="mono mt-2 text-3xl font-semibold">{customerStats.filter(c => c.totalOrders > 0).length}</p>
      </Card>
    </div>
    <Card className="overflow-hidden">
      <div className="border-b px-5 py-4">
        <h2 className="font-semibold">Top Customers by Revenue</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Customer performance metrics and analytics</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-muted/55 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3.5">Customer</th>
              <th>Total Orders</th>
              <th>Total Spent</th>
              <th>Avg Order</th>
              <th>Frequency</th>
              <th>First Order</th>
              <th>Last Order</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customerStats.length > 0 ? (
              customerStats.map((stat, index) => (
                <tr key={stat.customerName} className="hover:bg-muted/25">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                        {stat.customerName.split(' ').map(x => x[0]).join('').slice(0, 2)}
                      </span>
                      <p className="font-semibold">{stat.customerName}</p>
                    </div>
                  </td>
                  <td className="mono">{stat.totalOrders}</td>
                  <td className="mono">{money(stat.totalSpent)}</td>
                  <td className="mono">{money(stat.avgOrderValue)}</td>
                  <td className="mono">{stat.purchaseFrequency > 0 ? `${stat.purchaseFrequency} days` : '—'}</td>
                  <td className="text-xs">{shortDate(stat.firstOrderDate)}</td>
                  <td className="text-xs">{shortDate(stat.lastOrderDate)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center">
                  <Empty icon={Users} title="No customer data yet" detail="Customer analytics will appear once you have orders." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  </div>;
}

function ClientModal({ value, onClose, onSave }: { value: Client; onClose: () => void; onSave: (v: Client) => void }) {
  const [c, setC] = useState(value);
  const set = (k: keyof Client, v: string) => setC(x => ({ ...x, [k]: v }));
  return <Modal title={value.name ? 'Edit client' : 'New client'} subtitle="Saved details auto-fill future invoices." onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); onSave(c); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client name"><Input required value={c.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Phone"><Input value={c.phone} onChange={e => set('phone', e.target.value)} /></Field>
        <Field label="Address"><Input value={c.address} onChange={e => set('address', e.target.value)} /></Field>
        <Field label="City"><Input value={c.city} onChange={e => set('city', e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={c.email} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Status"><Select value={c.status || 'active'} onChange={e => set('status', e.target.value)}><option value="active">Active</option><option value="pending">Pending</option></Select></Field>
      </div>
      <Field label="Notes"><textarea className="min-h-16 w-full rounded-lg border bg-background p-3 text-sm outline-none" value={c.notes} onChange={e => set('notes', e.target.value)} /></Field>
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save client</Button></div>
    </form>
  </Modal>;
}

function SettingsPage() {
  const { store, update } = useStore(); const isMobile = useIsMobile(); const [s, setS] = useState(store.settings); const [saved, setSaved] = useState(false); const file = useRef<HTMLInputElement>(null);
  useEffect(() => setS(store.settings), [store.settings]);
  const save = (e: FormEvent) => { e.preventDefault(); update({ settings: s }); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  const backup = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' })); a.download = 'little-bliss-backup.json'; a.click(); };
  const importBackup = (event: React.ChangeEvent<HTMLInputElement>) => { const f = event.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)) as Store; if (parsed.recipes && parsed.ingredients && parsed.settings) update(parsed); } catch { window.alert('That backup could not be read.'); } }; reader.readAsText(f); };
  if (isMobile) { return <div><h1 className="display text-xl font-semibold mb-4">Settings</h1><Card className="p-4 mb-4"><h2 className="text-sm font-semibold mb-3">Business info</h2><form onSubmit={save} className="space-y-3"><Field label="Bakery name"><Input value={s.bakeryName} onChange={e => setS({ ...s, bakeryName: e.target.value })} /></Field><Field label="Phone"><Input value={s.phone} onChange={e => setS({ ...s, phone: e.target.value })} /></Field><Field label="Email"><Input type="email" value={s.email} onChange={e => setS({ ...s, email: e.target.value })} /></Field><Field label="Address"><Input value={s.address} onChange={e => setS({ ...s, address: e.target.value })} /></Field><div className="flex items-center justify-between pt-2"><span className={cx('text-xs font-semibold text-primary', !saved && 'opacity-0')}><Check size={14} className="mr-1 inline" /> Saved</span><Button type="submit">Save</Button></div></form></Card><Card className="p-4 mb-4"><h2 className="text-sm font-semibold mb-3">Appearance</h2><div className="grid grid-cols-2 gap-2">{['light', 'dark'].map(t => <button key={t} onClick={() => update({ settings: { ...store.settings, theme: t } })} className={cx('rounded-lg border p-3 text-center text-xs font-semibold', s.theme === t ? 'border-primary bg-primary/5' : 'hover:bg-muted')}>{t === 'light' ? '☀️' : '🌙'} {t}</button>)}</div></Card><Card className="p-4"><h2 className="text-sm font-semibold mb-3">Data</h2><div className="space-y-2"><Button variant="soft" className="w-full justify-start" onClick={backup}><Download size={16} /> Export backup</Button><Button variant="ghost" className="w-full justify-start" onClick={() => file.current?.click()}><Upload size={16} /> Import backup</Button><input ref={file} type="file" accept=".json" className="hidden" onChange={importBackup} /><Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { if (window.confirm('Reset all data? This cannot be undone.')) { resetStore(); window.location.reload(); } }}><Trash2 size={16} /> Reset data</Button></div></Card></div>; }
  return <div><PageHeader eyebrow="Your bakery" title="Settings" description="A few details that make this desk feel like yours." /><div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Card className="p-5 sm:p-6"><div className="mb-5"><h2 className="font-semibold">Business information</h2><p className="mt-1 text-xs text-muted-foreground">Shown in your local workspace and exports.</p></div><form onSubmit={save} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Bakery name"><Input value={s.bakeryName} onChange={e => setS({ ...s, bakeryName: e.target.value })} /></Field><Field label="Phone"><Input value={s.phone} onChange={e => setS({ ...s, phone: e.target.value })} /></Field><Field label="Email"><Input type="email" value={s.email} onChange={e => setS({ ...s, email: e.target.value })} /></Field><Field label="Currency"><Select value={s.currency} onChange={e => setS({ ...s, currency: e.target.value })}><option value="E">E · Eswatini Lilangeni</option></Select></Field></div><Field label="Address"><Input value={s.address} onChange={e => setS({ ...s, address: e.target.value })} /></Field><div className="flex items-center justify-between border-t pt-4"><span className={cx('text-xs font-semibold text-primary transition-opacity', !saved && 'opacity-0')}><Check size={14} className="mr-1 inline" /> Saved just now</span><Button type="submit" data-testid="button-save-settings">Save changes</Button></div></form></Card><div className="space-y-5"><Card className="p-5 sm:p-6"><h2 className="font-semibold">Appearance</h2><p className="mt-1 text-xs text-muted-foreground">Choose the mood for early mornings.</p><div className="mt-4 grid grid-cols-2 gap-2"><button data-testid="button-theme-light" onClick={() => update({ settings: { ...store.settings, theme: 'light' } })} className={cx('rounded-lg border p-3 text-left', s.theme === 'light' ? 'border-primary bg-primary/5' : 'hover:bg-muted')}><div className="mb-2 h-8 rounded bg-[#f8f4eb] ring-1 ring-border" /><p className="text-xs font-semibold">Morning light</p></button><button data-testid="button-theme-dark" onClick={() => update({ settings: { ...store.settings, theme: 'dark' } })} className={cx('rounded-lg border p-3 text-left', s.theme === 'dark' ? 'border-primary bg-primary/5' : 'hover:bg-muted')}><div className="mb-2 h-8 rounded bg-[#291b23] ring-1 ring-border" /><p className="text-xs font-semibold">After hours</p></button></div></Card><Card className="p-5 sm:p-6"><h2 className="font-semibold">Your data</h2><p className="mt-1 text-xs text-muted-foreground">Everything stays in this browser on this device.</p><div className="mt-4 space-y-2"><Button variant="soft" className="w-full justify-start" onClick={backup}><Download size={16} /> Export JSON backup</Button><Button variant="ghost" className="w-full justify-start border" onClick={() => file.current?.click()}><Upload size={16} /> Import JSON backup</Button><input ref={file} type="file" accept=".json" className="hidden" onChange={importBackup} /><Button variant="ghost" className="w-full justify-start border text-destructive hover:bg-destructive/10" onClick={() => { if (window.confirm('Reset all local data to the original demo?')) { resetStore(); window.location.reload(); } }}><RefreshCw size={16} /> Reset demo data</Button></div><div className="mt-4 rounded-lg bg-accent/25 p-3 text-xs leading-relaxed text-muted-foreground"><CircleAlert size={14} className="mr-1 inline text-primary" /> Device storage reminder: clear browser data or private browsing can remove your bakery records. Export a backup occasionally.</div></Card></div></div></div>;
}
function NotFound() { return <div className="flex min-h-[60vh] flex-col items-center justify-center text-center"><span className="rounded-full bg-secondary p-4"><FileText size={24} /></span><h1 className="display mt-5 text-3xl">That shelf is empty.</h1><p className="mt-2 text-sm text-muted-foreground">This page is not part of the bakery desk.</p><Link href="/" className="mt-5 text-sm font-semibold text-primary hover:underline">Return to overview</Link></div>; }

/* ─── SALES ANALYTICS DASHBOARD ─── */
function SalesAnalytics() {
  const { store } = useStore();
  const [period, setPeriod] = useState<RevenuePeriod>('month');
  const analytics = useMemo(() => calculateSalesAnalytics(store.orders, store.recipes, period), [store.orders, store.recipes, period]);
  const isMobile = useIsMobile();

  return <div className="stagger">
    <PageHeader eyebrow="Analytics" title="Sales Dashboard" description="Track your sales trends, top products, and revenue growth." />
    <div className="mb-5 flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 w-fit">
      {REVENUE_PERIODS.map(p => (
        <button key={p.value} onClick={() => setPeriod(p.value)} className={cx('rounded-md px-3 py-1.5 text-xs font-semibold', period === p.value ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted')}>
          {p.label}
        </button>
      ))}
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total Revenue" value={money(analytics.totalRevenue)} trend={`${analytics.totalOrders} orders`} icon={TrendingUp} tone="primary" note={revenuePeriodLabel(period)} />
      <Metric label="Average Order" value={money(analytics.averageOrderValue)} trend="per order" icon={Banknote} tone="lime" note="average value" />
      <Metric label="Total Orders" value={analytics.totalOrders.toString()} trend="processed" icon={Receipt} tone="peach" note="in this period" />
      <Metric label="Top Product" value={analytics.topProducts[0]?.productName || '—'} trend={analytics.topProducts[0] ? money(analytics.topProducts[0].revenue) : 'No data'} icon={Sparkles} tone="dark" note="best seller" />
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Monthly Trend</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Revenue over the last 12 months</p>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-1 h-40">
            {analytics.monthlyTrend.map((m, i) => {
              const maxRevenue = Math.max(...analytics.monthlyTrend.map(x => x.revenue));
              const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={cx('w-full rounded-t-sm', height > 0 ? 'bg-primary' : 'bg-muted')} style={{ height: `${Math.max(4, height)}%` }} />
                  <span className="text-[9px] text-muted-foreground">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Category Breakdown</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Revenue by product category</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {analytics.categoryBreakdown.length ? analytics.categoryBreakdown.map(cat => {
            const total = analytics.categoryBreakdown.reduce((s, c) => s + c.revenue, 0);
            const pct = total > 0 ? (cat.revenue / total) * 100 : 0;
            return (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{cat.category}</span>
                  <span className="mono text-xs font-semibold">{money(cat.revenue)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          }) : <Empty icon={BarChart3} title="No category data" detail="Sales data will appear here once you have orders." />}
        </div>
      </Card>
    </div>
    <Card className="mt-5 overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Top Products</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Best-selling products by revenue</p>
        </div>
      </div>
      <div className="p-5">
        {analytics.topProducts.length ? (
          <div className="space-y-3">
            {analytics.topProducts.map((product, i) => (
              <div key={product.productId} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold">{product.productName}</p>
                    <p className="text-xs text-muted-foreground">{product.quantity} units sold</p>
                  </div>
                </div>
                <span className="mono text-sm font-semibold">{money(product.revenue)}</span>
              </div>
            ))}
          </div>
        ) : <Empty icon={Box} title="No product data" detail="Product sales will appear here once you have orders." />}
      </div>
    </Card>
  </div>;
}

/* ─── PRODUCTION CALENDAR ─── */
function ProductionCalendar() {
  const { store } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const schedules = useMemo(() => generateProductionSchedule(store.orders, store.recipes), [store.orders, store.recipes]);
  const filteredSchedules = schedules.filter(s => s.date === selectedDate);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return <div className="stagger">
    <PageHeader eyebrow="Production" title="Production Calendar" description="View and manage your baking schedule based on order due dates." />
    <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
      {weekDates.map(date => {
        const d = new Date(date);
        const hasItems = schedules.some(s => s.date === date);
        return (
          <button key={date} onClick={() => setSelectedDate(date)} className={cx('flex-shrink-0 rounded-lg border px-4 py-2 text-center min-w-[80px]', selectedDate === date ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted')}>
            <p className="text-[10px] text-muted-foreground">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
            <p className="text-sm font-semibold">{d.getDate()}</p>
            {hasItems && <span className="mt-1 h-1 w-1 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
    <Card>
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{filteredSchedules.length} items scheduled</p>
        </div>
      </div>
      <div className="p-5">
        {filteredSchedules.length ? (
          <div className="space-y-3">
            {filteredSchedules.map(schedule => (
              <div key={schedule.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-semibold">{schedule.recipeName}</p>
                  <p className="text-xs text-muted-foreground">{schedule.quantity} dozens</p>
                </div>
                <span className={cx('rounded-full px-2 py-1 text-[10px] font-semibold', schedule.status === 'scheduled' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground')}>
                  {schedule.status}
                </span>
              </div>
            ))}
          </div>
        ) : <Empty icon={CalendarDays} title="No production scheduled" detail="Items will appear here when orders have due dates within the next 7 days." />}
      </div>
    </Card>
  </div>;
}

/* ─── PURCHASE ORDERS ─── */
function PurchaseOrders() {
  const { store, update } = useStore();
  const [showGenerate, setShowGenerate] = useState(false);
  const autoOrders = useMemo(() => generatePurchaseOrders(store.ingredients), [store.ingredients]);

  const handleGenerate = () => {
    const newOrders = generatePurchaseOrders(store.ingredients);
    update({ purchaseOrders: [...store.purchaseOrders, ...newOrders] });
    setShowGenerate(false);
  };

  return <div className="stagger">
    <PageHeader eyebrow="Procurement" title="Purchase Orders" description="Manage ingredient reordering when stock runs low." action={<Button onClick={() => setShowGenerate(true)}><RefreshCw size={16} /> Generate Orders</Button>} />
    {showGenerate && (
      <Card className="mb-5 border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Auto-generate purchase orders</p>
            <p className="text-xs text-muted-foreground">{autoOrders.length} ingredients are at or below minimum stock</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={handleGenerate}>Generate {autoOrders.length} Orders</Button>
          </div>
        </div>
      </Card>
    )}
    <Card>
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Purchase Orders</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{store.purchaseOrders.length} orders</p>
        </div>
      </div>
      <div className="p-5">
        {store.purchaseOrders.length ? (
          <div className="space-y-3">
            {store.purchaseOrders.map(po => (
              <div key={po.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-semibold">{po.ingredientName}</p>
                  <p className="text-xs text-muted-foreground">{po.supplier} · {po.quantity} {po.unit}</p>
                </div>
                <div className="text-right">
                  <p className="mono text-sm font-semibold">{money(po.estimatedCost)}</p>
                  <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-semibold', po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : po.status === 'ordered' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800')}>
                    {po.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty icon={Package} title="No purchase orders" detail="Generate orders automatically or add them manually when stock is low." />}
      </div>
    </Card>
  </div>;
}

/* ─── PROFIT MARGIN CALCULATOR ─── */
function ProfitMargin() {
  const { store } = useStore();

  const profitData = useMemo(() => {
    return store.recipes.map(recipe => {
      const cost = costPerDozen(recipe, store.ingredients);
      const issues = recipeCostIssues(recipe, store.ingredients);
      const revenue = recipe.retailPriceDozen;
      const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
      return { recipe, cost, revenue, margin, issues };
    }).sort((a, b) => b.margin - a.margin);
  }, [store.recipes, store.ingredients]);

  return <div className="stagger">
    <PageHeader eyebrow="Profitability" title="Profit Margin Calculator" description="Analyze per-product profitability based on ingredient costs." />
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Product Profitability</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Margin analysis for all recipes</p>
        </div>
      </div>
      <div className="p-5">
        {profitData.length ? (
          <div className="space-y-3">
            {profitData.map(({ recipe, cost, revenue, margin, issues }) => (
              <div key={recipe.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{recipe.name}</p>
                  <p className="text-xs text-muted-foreground">Cost: {money(cost)} · Price: {money(revenue)}</p>
                  {issues.count > 0 && <p className="mt-0.5 text-[10px] font-medium text-destructive">{recipeIssueLabel(issues)} — margin uses the priced part only</p>}
                </div>
                <div className="text-right">
                  <p className={cx('mono text-sm font-semibold', margin >= 50 ? 'text-primary' : margin >= 30 ? 'text-yellow-600' : 'text-destructive')}>
                    {margin.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">margin</p>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty icon={CircleDollarSign} title="No recipe data" detail="Add recipes with ingredient costs to see profit margins." />}
      </div>
    </Card>
  </div>;
}

/* ─── FINANCIAL REPORTS ─── */
function FinancialReports() {
  const { store } = useStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const reportData = useMemo(() => {
    const monthOrders = store.orders.filter(o => !o.excludeFromRevenue && o.orderDate.startsWith(selectedMonth));
    const monthExpenses = store.expenses.filter(e => e.date.startsWith(selectedMonth));
    const revenue = monthOrders.reduce((s, o) => s + calculateOrderTotal(o.items, o.discount, o.deliveryFee, o.taxRate || 0), 0);
    const expenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const profit = revenue - expenses;

    const expenseBreakdown = new Map<string, number>();
    monthExpenses.forEach(e => {
      const existing = expenseBreakdown.get(e.category) || 0;
      expenseBreakdown.set(e.category, existing + e.amount);
    });

    return {
      month: selectedMonth,
      revenue,
      expenses,
      profit,
      expenseBreakdown: Array.from(expenseBreakdown.entries()).map(([category, amount]) => ({ category, amount })),
    };
  }, [store.orders, store.expenses, selectedMonth]);

  return <div className="stagger">
    <PageHeader eyebrow="Finance" title="Financial Reports" description="Monthly profit & loss and expense breakdown." />
    <div className="mb-5">
      <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Revenue" value={money(reportData.revenue)} trend="total sales" icon={TrendingUp} tone="primary" note="this month" />
      <Metric label="Expenses" value={money(reportData.expenses)} trend="total costs" icon={ArrowDownRight} tone="peach" note="this month" />
      <Metric label="Profit" value={money(reportData.profit)} trend={reportData.revenue > 0 ? `${((reportData.profit / reportData.revenue) * 100).toFixed(1)}% margin` : '—'} icon={Sparkles} tone={reportData.profit >= 0 ? 'lime' : 'dark'} note="net profit" />
      <Metric label="Net Margin" value={reportData.revenue > 0 ? `${((reportData.profit / reportData.revenue) * 100).toFixed(1)}%` : '—'} trend="profitability" icon={CircleDollarSign} tone="primary" note="of revenue" />
    </div>
    <Card className="mt-5 overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Expense Breakdown</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">By category</p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {reportData.expenseBreakdown.length ? reportData.expenseBreakdown.map(cat => {
          const total = reportData.expenseBreakdown.reduce((s, c) => s + c.amount, 0);
          const pct = total > 0 ? (cat.amount / total) * 100 : 0;
          return (
            <div key={cat.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{cat.category}</span>
                <span className="mono text-xs font-semibold">{money(cat.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        }) : <Empty icon={Wallet} title="No expense data" detail="Expenses will appear here once recorded." />}
      </div>
    </Card>
  </div>;
}

/* ─── EXPIRATION TRACKING ─── */
function ExpirationTracking() {
  const { store, update } = useStore();
  const today = new Date();

  const expiringSoon = useMemo(() => {
    return store.ingredients
      .filter(i => i.expirationDate)
      .map(i => ({ ...i, daysUntilExpiry: Math.ceil((new Date(i.expirationDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) }))
      .filter(i => i.daysUntilExpiry <= 30 && i.daysUntilExpiry >= 0)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }, [store.ingredients]);

  const expired = useMemo(() => {
    return store.ingredients
      .filter(i => i.expirationDate && new Date(i.expirationDate) < today)
      .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
  }, [store.ingredients]);

  return <div className="stagger">
    <PageHeader eyebrow="Inventory" title="Expiration Tracking" description="Track ingredient expiration dates and get alerts." />
    {expired.length > 0 && (
      <Card className="mb-5 border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><CircleAlert size={18} /></span>
          <div>
            <p className="text-sm font-semibold text-destructive">{expired.length} expired ingredient{expired.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-muted-foreground">These items should be discarded or used immediately</p>
          </div>
        </div>
      </Card>
    )}
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Expiring Soon</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Within 30 days</p>
          </div>
          <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">{expiringSoon.length}</span>
        </div>
        <div className="p-5">
          {expiringSoon.length ? (
            <div className="space-y-3">
              {expiringSoon.map(ing => (
                <div key={ing.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-semibold">{ing.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ing.expirationDate!).toLocaleDateString()}</p>
                  </div>
                  <span className={cx('rounded-full px-2 py-1 text-[10px] font-semibold', ing.daysUntilExpiry <= 7 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800')}>
                    {ing.daysUntilExpiry} day{ing.daysUntilExpiry !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : <Empty icon={Clock} title="No items expiring soon" detail="Set expiration dates on ingredients to track them here." />}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Expired</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Past expiration date</p>
          </div>
          <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">{expired.length}</span>
        </div>
        <div className="p-5">
          {expired.length ? (
            <div className="space-y-3">
              {expired.map(ing => (
                <div key={ing.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div>
                    <p className="text-sm font-semibold">{ing.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ing.expirationDate!).toLocaleDateString()}</p>
                  </div>
                  <span className="rounded-full bg-destructive px-2 py-1 text-[10px] font-semibold text-destructive-foreground">Expired</span>
                </div>
              ))}
            </div>
          ) : <Empty icon={Check} title="No expired items" detail="Good news — no ingredients have expired." />}
        </div>
      </Card>
    </div>
  </div>;
}

/* ─── DELIVERY ROUTES ─── */
function DeliveryRoutes() {
  const { store, update } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const pendingDeliveries = useMemo(() => {
    return store.orders
      .filter(o => o.paymentStatus !== 'Paid' && !o.archived && o.dueDate === selectedDate)
      .sort((a, b) => a.customerCity.localeCompare(b.customerCity));
  }, [store.orders, selectedDate]);

  const optimizeRoute = () => {
    const route: DeliveryRoute = {
      id: `route-${Date.now()}`,
      date: selectedDate,
      orders: pendingDeliveries.map(o => o.id),
      route: pendingDeliveries.map(o => `${o.customerAddress}, ${o.customerCity}`),
      estimatedTime: pendingDeliveries.length * 15,
      status: 'planned',
      driver: '',
      notes: '',
    };
    update({ deliveryRoutes: [...store.deliveryRoutes, route] });
  };

  return <div className="stagger">
    <PageHeader eyebrow="Logistics" title="Delivery Routes" description="Plan and optimize delivery routes based on customer addresses." action={pendingDeliveries.length > 0 && <Button onClick={optimizeRoute}><MapIcon size={16} /> Optimize Route</Button>} />
    <div className="mb-5">
      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm" />
    </div>
    <Card>
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Pending Deliveries</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{pendingDeliveries.length} orders for {new Date(selectedDate).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="p-5">
        {pendingDeliveries.length ? (
          <div className="space-y-3">
            {pendingDeliveries.map(order => (
              <div key={order.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-semibold">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.customerAddress}, {order.customerCity}</p>
                </div>
                <span className="text-xs text-muted-foreground">{order.phone}</span>
              </div>
            ))}
          </div>
        ) : <Empty icon={MapIcon} title="No deliveries scheduled" detail="Select a date with pending orders to plan routes." />}
      </div>
    </Card>
  </div>;
}

/* ─── WHATSAPP INTEGRATION ─── */
function WhatsAppIntegration() {
  const { store, update } = useStore();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const pendingOrders = store.orders.filter(o => o.paymentStatus !== 'Paid' && !o.archived);

  const sendWhatsAppMessage = (order: Order, type: 'confirmation' | 'reminder' | 'update') => {
    const message: WhatsAppMessage = {
      id: `wa-${Date.now()}`,
      orderId: order.id,
      customerPhone: order.phone,
      type,
      message: type === 'confirmation' 
        ? `Hi ${order.customerName}, your order ${order.orderNumber} has been confirmed. Due: ${order.dueDate}. Total: ${money(calculateOrderTotal(order.items, order.discount, order.deliveryFee, order.taxRate || 0))}. Thank you!`
        : type === 'reminder'
        ? `Hi ${order.customerName}, friendly reminder about your order ${order.orderNumber} due on ${order.dueDate}. Payment: ${order.paymentStatus}.`
        : `Hi ${order.customerName}, update on your order ${order.orderNumber}.`,
      sentAt: new Date().toISOString(),
      status: 'pending',
    };
    update({ whatsappMessages: [...store.whatsappMessages, message] });
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message.message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return <div className="stagger">
    <PageHeader eyebrow="Communication" title="WhatsApp Integration" description="Send order confirmations and payment reminders via WhatsApp." />
    <Card>
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Pending Orders</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{pendingOrders.length} orders that need communication</p>
        </div>
      </div>
      <div className="p-5">
        {pendingOrders.length ? (
          <div className="space-y-3">
            {pendingOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-semibold">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.orderNumber} · {order.phone}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="soft" className="text-xs" onClick={() => sendWhatsAppMessage(order, 'confirmation')}>Confirm</Button>
                  <Button variant="soft" className="text-xs" onClick={() => sendWhatsAppMessage(order, 'reminder')}>Remind</Button>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty icon={Bell} title="No pending orders" detail="Orders awaiting payment will appear here for WhatsApp communication." />}
      </div>
    </Card>
  </div>;
}

/* ─── STAFF TASKS ─── */
function StaffTasks() {
  const { store, update } = useStore();
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<StaffTask>>({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: new Date().toISOString().slice(0, 10),
    category: 'other',
  });

  const addTask = () => {
    if (!newTask.title) return;
    const task: StaffTask = {
      id: `task-${Date.now()}`,
      title: newTask.title!,
      description: newTask.description || '',
      assignedTo: newTask.assignedTo || '',
      priority: newTask.priority || 'medium',
      status: 'todo',
      dueDate: newTask.dueDate!,
      category: newTask.category || 'other',
    };
    update({ staffTasks: [...store.staffTasks, task] });
    setShowAddTask(false);
    setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: new Date().toISOString().slice(0, 10), category: 'other' });
  };

  const toggleTaskStatus = (taskId: string) => {
    update({
      staffTasks: store.staffTasks.map(t => 
        t.id === taskId 
          ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed', completedAt: t.status === 'completed' ? undefined : new Date().toISOString() }
          : t
      ),
    });
  };

  const todayTasks = store.staffTasks.filter(t => t.dueDate === new Date().toISOString().slice(0, 10));

  return <div className="stagger">
    <PageHeader eyebrow="Operations" title="Staff Task Board" description="Manage daily tasks for kitchen staff." action={<Button onClick={() => setShowAddTask(true)}><Plus size={16} /> Add Task</Button>} />
    {showAddTask && (
      <Card className="mb-5 p-5">
        <h3 className="font-semibold mb-4">New Task</h3>
        <div className="space-y-3">
          <Field label="Task title"><Input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} /></Field>
          <Field label="Description"><textarea className="min-h-16 w-full rounded-lg border bg-background p-3 text-sm" value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Assigned to"><Input value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })} /></Field>
            <Field label="Priority"><Select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></Field>
          </div>
          <Field label="Due date"><Input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} /></Field>
          <Field label="Category"><Select value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value as any })}><option value="baking">Baking</option><option value="cleaning">Cleaning</option><option value="inventory">Inventory</option><option value="delivery">Delivery</option><option value="other">Other</option></Select></Field>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowAddTask(false)}>Cancel</Button>
            <Button onClick={addTask}>Add Task</Button>
          </div>
        </div>
      </Card>
    )}
    <Card>
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Today's Tasks</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{todayTasks.length} tasks for today</p>
        </div>
      </div>
      <div className="p-5">
        {todayTasks.length ? (
          <div className="space-y-3">
            {todayTasks.map(task => (
              <div key={task.id} className={cx('flex items-center justify-between gap-3 p-3 rounded-lg border', task.status === 'completed' && 'bg-muted/30')}>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleTaskStatus(task.id)} className={cx('h-5 w-5 rounded border', task.status === 'completed' ? 'bg-primary border-primary' : 'border-muted-foreground')}>
                    {task.status === 'completed' && <Check size={12} className="text-primary-foreground" />}
                  </button>
                  <div>
                    <p className={cx('text-sm font-semibold', task.status === 'completed' && 'line-through text-muted-foreground')}>{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.assignedTo || 'Unassigned'} · {task.category}</p>
                  </div>
                </div>
                <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-semibold', task.priority === 'high' ? 'bg-red-100 text-red-800' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800')}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        ) : <Empty icon={ClipboardList} title="No tasks for today" detail="Add tasks to keep your kitchen organized and efficient." />}
      </div>
    </Card>
  </div>;
}

/* ─── BACKUP & RESTORE ─── */
function BackupRestore() {
  const { store, update } = useStore();
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const createBackup = () => {
    const backup: BackupRecord = {
      id: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      size: JSON.stringify(store).length,
      location: 'local',
      status: 'success',
      checksum: Date.now().toString(),
    };
    update({ backupRecords: [...store.backupRecords, backup] });
    setLastBackup(new Date().toISOString());
    
    // Download backup file
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' }));
    a.download = `little-bliss-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const restoreBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Store;
        if (parsed.recipes && parsed.ingredients && parsed.settings) {
          if (window.confirm('This will replace all current data. Continue?')) {
            update(parsed);
          }
        }
      } catch {
        window.alert('That backup could not be read.');
      }
    };
    reader.readAsText(file);
  };

  return <div className="stagger">
    <PageHeader eyebrow="Data" title="Backup & Restore" description="Create backups and restore your bakery data." />
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-lg bg-secondary p-2"><Archive size={18} /></span>
          <div>
            <h2 className="font-semibold">Create Backup</h2>
            <p className="text-xs text-muted-foreground">Download a complete backup of your data</p>
          </div>
        </div>
        <Button onClick={createBackup} className="w-full"><Download size={16} /> Download Backup</Button>
        {lastBackup && <p className="mt-3 text-xs text-muted-foreground">Last backup: {new Date(lastBackup).toLocaleString()}</p>}
      </Card>
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-lg bg-primary/10 p-2 text-primary"><Upload size={18} /></span>
          <div>
            <h2 className="font-semibold">Restore Backup</h2>
            <p className="text-xs text-muted-foreground">Restore from a previously saved backup file</p>
          </div>
        </div>
        <input type="file" accept=".json" onChange={restoreBackup} className="hidden" id="restore-file" />
        <Button variant="soft" className="w-full" onClick={() => document.getElementById('restore-file')?.click()}><Upload size={16} /> Select Backup File</Button>
      </Card>
    </div>
    <Card className="mt-5 overflow-hidden">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Backup History</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{store.backupRecords.length} backups</p>
        </div>
      </div>
      <div className="p-5">
        {store.backupRecords.length ? (
          <div className="space-y-3">
            {store.backupRecords.slice().reverse().map(backup => (
              <div key={backup.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-semibold">{new Date(backup.timestamp).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{(backup.size / 1024).toFixed(2)} KB · {backup.location}</p>
                </div>
                <span className={cx('rounded-full px-2 py-0.5 text-[10px] font-semibold', backup.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                  {backup.status}
                </span>
              </div>
            ))}
          </div>
        ) : <Empty icon={Archive} title="No backups yet" detail="Create your first backup to secure your data." />}
      </div>
    </Card>
  </div>;
}

function printWithTitle(title: string, opts?: { landscape?: boolean }) {
  const prev = document.title;
  const pageRule = document.getElementById('lb-print-page') || document.createElement('style');
  pageRule.id = 'lb-print-page';
  pageRule.textContent = opts?.landscape
    ? '@page { size: A4 landscape; margin: 12mm 14mm; }'
    : '@page { size: A4 portrait; margin: 10mm; }';
  if (!pageRule.parentNode) document.head.appendChild(pageRule);

  document.title = title;
  document.body.classList.add('printing-doc');

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    window.removeEventListener('afterprint', cleanup);
    document.title = prev;
    document.body.classList.remove('printing-doc');
    pageRule.remove();
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  // Fallback for engines that skip or delay afterprint (print-to-PDF, WebViews)
  setTimeout(cleanup, 2000);
}

function Router() { return <Switch><Route path="/" component={Dashboard} /><Route path="/ingredients" component={Ingredients} /><Route path="/recipes" component={Recipes} /><Route path="/orders" component={Orders} /><Route path="/expenses" component={Expenses} /><Route path="/inventory" component={Inventory} /><Route path="/reports" component={Reports} /><Route path="/budget" component={Budget} /><Route path="/clients" component={Clients} /><Route path="/customer-analytics" component={CustomerAnalytics} /><Route path="/sales-analytics" component={SalesAnalytics} /><Route path="/production-calendar" component={ProductionCalendar} /><Route path="/purchase-orders" component={PurchaseOrders} /><Route path="/profit-margin" component={ProfitMargin} /><Route path="/financial-reports" component={FinancialReports} /><Route path="/expiration-tracking" component={ExpirationTracking} /><Route path="/delivery-routes" component={DeliveryRoutes} /><Route path="/whatsapp-integration" component={WhatsAppIntegration} /><Route path="/staff-tasks" component={StaffTasks} /><Route path="/backup-restore" component={BackupRestore} /><Route path="/settings" component={SettingsPage} /><Route path="/audit" component={AuditLog} /><Route path="/more" component={MoreMenu} /><Route component={NotFound} /></Switch>; }
export default function App() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const update = (patch: Partial<Store>) => setStore(current => { const next = { ...current, ...patch }; saveStore(next); return next; });
  useEffect(() => { document.documentElement.classList.toggle('dark', store.settings.theme === 'dark'); }, [store.settings.theme]);
  return <StoreContext.Provider value={{ store, update }}><AppShell><Router /></AppShell></StoreContext.Provider>;
}