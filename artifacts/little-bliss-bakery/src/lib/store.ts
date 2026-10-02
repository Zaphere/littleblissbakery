export type Ingredient = {
  id: string; name: string; category: string; supplier: string; packSize: number; unit: string;
  purchasePrice: number; purchaseDate: string; notes: string; currentStock: number; minimumStock: number;
  priceHistory: { date: string; price: number }[];
  expirationDate?: string; // For expiration tracking
};

export const INGREDIENT_CATEGORIES = [
  'Dry goods', 'Fats', 'Dairy', 'Fruit', 'Chocolate',
  'Raising agents', 'Spices', 'Flavourings', 'Preserves',
] as const;

export const CLIENT_CATEGORIES = [
  'Individual', 'Guest House', 'Hotel', 'Bakery', 'Restaurant', 'Café', 'Lodge',
  'Office', 'Corporate', 'Retail', 'Event', 'School', 'Church/Organization', 'Other',
] as const;
export type RecipeIngredient = { ingredientId: string; quantity: number; unit: string; notes: string };
export type Recipe = {
  id: string; name: string; category: string; description: string; image: string;
  batchYield: number; servingSize: string; laborCost: number; energyCost: number; packagingCost: number;
  wastagePercent: number; retailPriceDozen: number; wholesalePriceDozen: number; active: boolean;
  ovenTemp: string; bakeTimeMinutes: number;
  ingredients: RecipeIngredient[]; doughWeight: number; finishedWeight: number; notes: string;
  version?: number; // For recipe versioning
  versionHistory?: RecipeVersion[]; // Track recipe changes
};

export type RecipeVersion = {
  version: number;
  timestamp: string;
  changedBy: string;
  changes: string;
  recipe: Recipe;
};
export type OrderItem = { productId: string; quantity: number; unitPrice: number; costSnapshot: number };
export type OrderPriority = 'Normal' | 'Rush' | 'Urgent';

export type Order = {
  id: string; invoiceNumber: string; orderNumber: string; customerName: string; customerAddress: string; customerCity: string; phone: string; orderDate: string; dueDate: string;
  salesRep: string; code: string; fob: string; taxRate: number;
  items: OrderItem[]; discount: number; deliveryFee: number; paymentStatus: string; paymentMethod: string;
  amountPaid: number; payments: { date: string; amount: number }[]; notes: string; createdAt: string; archived?: boolean;
  priority?: OrderPriority;
  excludeFromRevenue?: boolean; // receipt is disconnected from revenue stats (stock/reservations untouched)
};
export type Expense = { id: string; date: string; category: string; description: string; amount: number; supplier: string; relatedOrderId: string; notes: string };
export type InventoryTransaction = { id: string; ingredientId: string; type: string; quantity: number; date: string; note: string; minimumStock?: number };
export type BudgetAllocation = { id: string; name: string; mode: string; value: number };
export type Client = { 
  id: string; name: string; address: string; city: string; phone: string; email: string; notes: string; createdAt: string; status?: string;
  category?: string;
  // Customer insights
  totalOrders?: number;
  totalSpent?: number;
  averageOrderValue?: number;
  lastOrderDate?: string;
  paymentPattern?: 'prompt' | 'delayed' | 'partial';
  loyaltyPoints?: number;
};
export type AuditLogEntry = { id: string; timestamp: string; section: string; action: string; entityId: string; entityName: string; details: string; changedBy: string };
export type Notification = { id: string; timestamp: string; title: string; body: string; section: string; read: boolean; entityId?: string };
export type Settings = { bakeryName: string; phone: string; email: string; address: string; currency: string; theme: string; nextInvoiceNumber?: number; hasSeenWelcome?: boolean };
// New types for additional features
export type PurchaseOrder = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  supplier: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  status: 'pending' | 'ordered' | 'received';
  orderDate: string;
  expectedDeliveryDate?: string;
  notes: string;
};

export type StaffTask = {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate: string;
  completedAt?: string;
  category: 'baking' | 'cleaning' | 'inventory' | 'delivery' | 'other';
};

export type DeliveryRoute = {
  id: string;
  date: string;
  orders: string[]; // Order IDs
  route: string[]; // Addresses in order
  estimatedTime: number; // minutes
  status: 'planned' | 'in_progress' | 'completed';
  driver: string;
  notes: string;
};

export type WhatsAppMessage = {
  id: string;
  orderId: string;
  customerPhone: string;
  type: 'confirmation' | 'reminder' | 'update';
  message: string;
  sentAt: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
};

export type BackupRecord = {
  id: string;
  timestamp: string;
  size: number;
  location: 'local' | 'cloud';
  status: 'success' | 'failed';
  checksum: string;
};

export type SalesAnalytics = {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  /** Quantities are DOZENS, as entered on the order; `units` is the same figure in pieces. */
  topProducts: { productId: string; productName: string; quantity: number; units: number; revenue: number }[];
  monthlyTrend: { month: string; revenue: number }[];
  categoryBreakdown: { category: string; revenue: number }[];
};

export type ProductionSchedule = {
  id: string;
  date: string;
  recipeId: string;
  recipeName: string;
  quantity: number; // dozens
  orderId?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  startTime?: string;
  endTime?: string;
  assignedTo?: string;
};

/* ─── BATCH RESERVATION ───
   A receipt only *promises* goods. Reserving the ingredients behind it at the moment
   the order is saved is what stops two orders spending the same flour. Stock only
   leaves the pantry when the batch is issued (baked) — that is the point of no
   return, and a cancel after it has to be booked as waste rather than a release. */
export type ReservationStatus = 'reserved' | 'issued' | 'released' | 'wasted';
export type ReservationLine = { ingredientId: string; ingredientName: string; quantity: number; unit: string };
export type MaterialReservation = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  dueDate: string;
  status: ReservationStatus;
  lines: ReservationLine[];
  createdAt: string;
  updatedAt: string;
  issuedAt?: string;
  closedAt?: string;
  closedReason?: string;
  wastedValue?: number;
};

export type BatchPlanLine = { item: OrderItem; recipe: Recipe; batches: number };
export type PreBakeLine = {
  ingredientId: string;
  ingredientName: string;
  required: number;
  onHand: number;
  reservedElsewhere: number;
  available: number;
  shortfall: number;
  sufficient: boolean;
  missing: boolean;
  /** True when at least one recipe row's unit cannot be converted into the ingredient's unit. */
  unitMismatch: boolean;
  /** Rows held back from `required` because their unit could not be converted. */
  unconvertibleRows: number;
  unit: string;
  unitCost: number | null;
  cost: number;
};
export type PreBakePlan = {
  lines: PreBakeLine[];
  batches: { recipe: Recipe; batches: number; ordered: number; surplus: number }[];
  totalBatches: number;
  requiredCost: number;
  shortfallCost: number;
  shortageCount: number;
  unpricedCount: number;
  missingCount: number;
  /** Ingredients with at least one recipe row whose unit could not be converted. */
  unconvertibleCount: number;
  allAvailable: boolean;
};

export type FinancialReport = {
  id: string;
  month: string;
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  expenseBreakdown: { category: string; amount: number }[];
  generatedAt: string;
};

export type Store = { 
  ingredients: Ingredient[]; 
  recipes: Recipe[]; 
  orders: Order[]; 
  expenses: Expense[]; 
  transactions: InventoryTransaction[]; 
  allocations: BudgetAllocation[]; 
  clients: Client[]; 
  settings: Settings; 
  auditLog: AuditLogEntry[]; 
  notifications: Notification[]; 
  // New fields for additional features
  purchaseOrders: PurchaseOrder[];
  staffTasks: StaffTask[];
  deliveryRoutes: DeliveryRoute[];
  whatsappMessages: WhatsAppMessage[];
  backupRecords: BackupRecord[];
  productionSchedules: ProductionSchedule[];
  financialReports: FinancialReport[];
  reservations: MaterialReservation[];
};

const d = new Date().toISOString().slice(0, 10);
const ingredients: Ingredient[] = [
  ['flour', "Baker's Pride Flour", 'Dry goods', "Baker's Pride", 1000, 'g', 15.70, d, '', 1000, 500],
  ['sugar-granulated', 'Granulated Sugar', 'Dry goods', 'Shoprite', 2500, 'g', 35, d, '', 2425, 400],
  ['sugar-caster', 'Castor Sugar', 'Dry goods', 'Shoprite', 500, 'g', 34.99, d, '', 500, 400],
  ['icing', 'Icing Sugar', 'Dry goods', 'Shoprite', 500, 'g', 34.99, d, '', 600, 250],
  ['oats', 'Wright Oats', 'Dry goods', 'Shoprite', 1000, 'g', 48, d, '', 5000, 300],
  ['raisins', 'Safari Raisins', 'Fruit', 'Safari', 500, 'g', 100, d, '', 500, 250],
  ['chips', 'Chocolate Chips', 'Chocolate', 'Callebaut', 1000, 'g', 100, d, '', 2000, 200],
  ['baking-powder', 'Royal Baking Powder', 'Raising agents', 'Royal', 200, 'g', 38, d, '', 200, 100],
  ['bicarb', 'Bicarbonate of Soda', 'Raising agents', 'Shoprite', 200, 'g', 38, d, '', 10, 80],
  ['salt', 'Cerebos Iodated Salt', 'Dry goods', 'Shoprite', 500, 'g', 8, d, '', 500, 150],
  ['cinnamon', 'Ina Paarman Cinnamon', 'Spices', 'Shoprite', 50, 'g', 22, d, '', 110, 30],
  ['margarine', 'Sunshine Margarine', 'Fats', 'Sunshine', 500, 'g', 21, d, '', 500, 500],
  ['cooking-oil', 'Sunfoil Cooking Oil', 'Fats', 'Shoprite', 750, 'ml', 32, d, '', 750, 150],
  ['milk', 'Full Cream Milk', 'Dairy', 'Shoprite', 1000, 'ml', 18, d, '', 10000, 2000],
  ['eggs', 'Large Eggs', 'Dairy', 'Shoprite', 30, 'each', 52, d, '', 24, 12],
  ['vanilla', 'Brown & Polson Vanilla Essence', 'Flavourings', 'Shoprite', 100, 'ml', 28, d, '', 100, 40],
  ['jam', 'AG Jam', 'Preserves', 'AG Foods', 900, 'g', 100, d, '', 450, 180],
  ['cornflour', 'Ivor Cornflour', 'Dry goods', 'Shoprite', 500, 'g', 24, d, '', 200, 100],
].map((item: any) => Array.isArray(item) ? ({ id: item[0], name: item[1], category: item[2], supplier: item[3], packSize: item[4], unit: item[5], purchasePrice: item[6], purchaseDate: item[7], notes: item[8], currentStock: item[9], minimumStock: item[10], priceHistory: [{ date: item[7], price: item[6] }] }) : item);

const recipe = (id: string, name: string, price: number, category: string, items: [string, number, string][], batchYield: number, ovenTemp: string = '170-180°C', bakeTimeMinutes: number = 14): Recipe => ({
  id, name, category, description: '', image: '',
  batchYield, servingSize: '1 dozen', laborCost: 0, energyCost: 0, packagingCost: 0, wastagePercent: 0,
  retailPriceDozen: price, wholesalePriceDozen: price - 20, active: true, ovenTemp, bakeTimeMinutes,
  ingredients: items.map(([ingredientId, quantity, unit]) => ({ ingredientId, quantity, unit, notes: '' })),
  doughWeight: 0, finishedWeight: 0, notes: '',
});
const recipes: Recipe[] = [
  recipe('oat-raisin', 'Oat & Raisin Cookies', 180, 'Cookies', [['margarine', 250, 'g'], ['sugar-caster', 400, 'g'], ['vanilla', 15, 'ml'], ['eggs', 3, 'each'], ['flour', 450, 'g'], ['bicarb', 8, 'g'], ['baking-powder', 5, 'g'], ['salt', 5, 'g'], ['raisins', 250, 'g'], ['oats', 450, 'g']], 25),
  recipe('choc-chip', 'Chocolate Chip Cookies', 180, 'Cookies', [['margarine', 250, 'g'], ['sugar-caster', 250, 'g'], ['eggs', 3, 'each'], ['flour', 500, 'g'], ['bicarb', 10, 'g'], ['salt', 10, 'g'], ['chips', 300, 'g']], 25),
  recipe('dark-choc-chip', 'Dark Chocolate Chip Cookies', 190, 'Cookies', [['margarine', 250, 'g'], ['sugar-caster', 250, 'g'], ['eggs', 3, 'each'], ['flour', 500, 'g'], ['bicarb', 10, 'g'], ['salt', 10, 'g'], ['chips', 350, 'g']], 25),
  recipe('oatmeal', 'Oatmeal Pies', 170, 'Pies', [['margarine', 250, 'g'], ['sugar-granulated', 300, 'g'], ['vanilla', 10, 'ml'], ['eggs', 2, 'each'], ['flour', 400, 'g'], ['bicarb', 8, 'g'], ['baking-powder', 5, 'g'], ['salt', 5, 'g'], ['oats', 500, 'g']], 24, '170°C', 28),
  recipe('jam-tarts', 'Strawberry Jam Tarts', 200, 'Tarts', [['margarine', 85, 'g'], ['sugar-caster', 110, 'g'], ['eggs', 1, 'each'], ['flour', 150, 'g'], ['cornflour', 90, 'g'], ['baking-powder', 5, 'g'], ['jam', 400, 'g'], ['icing', 20, 'g'], ['cooking-oil', 5, 'ml']], 15),
];
const orders: Order[] = [];
const clients: Client[] = [
  { id: 'cli-skyfly', name: 'Sky Fly', address: '', city: '', phone: '76606385', email: '', notes: 'Sample sent - need to follow up on product feedback', createdAt: d, status: 'pending' },
  { id: 'cli-zakayla', name: 'Zakayla Guest House', address: '', city: '', phone: '78338868', email: '', notes: 'Wanted WhatsApp photos of products', createdAt: d, status: 'pending' },
  { id: 'cli-mbare', name: 'Mbare', address: '', city: '', phone: '76894143', email: '', notes: 'Called but line busy - need to reach out again', createdAt: d, status: 'pending' },
  { id: 'cli-secured', name: 'Secured Guest House', address: '', city: '', phone: '76655974', email: '', notes: 'Requested delivery', createdAt: d, status: 'pending' },
  { id: 'cli-george', name: 'The George Hotel', address: 'Corner of Ngwane & Du Toit St', city: 'Manzini', phone: '25052260', email: 'reservations@tgh.co.sz', notes: 'Corporate Hotel & Conference Venue - High tea/coffee demand. Website: tgh.co.sz', createdAt: d, status: 'pending' },
  { id: 'cli-asante', name: 'Asante Guest House', address: 'Lot 693, Corner Southern Distributor and Lugagane Road', city: 'Manzini', phone: '25053556', email: 'bookings@asanteswazi.com', notes: 'Guest House & Function Venue. Website: asanteswazi.com. Alt phone: 76735718', createdAt: d, status: 'pending' },
  { id: 'cli-globalvillage', name: 'Global Village Guesthouse', address: 'Phempetfwane St', city: 'Manzini', phone: '25052226', email: 'bookings@globalvillage.co.sz', notes: 'Guesthouse & Conference Facilities. Website: globalvillage.co.sz. Alt phone: 76037242', createdAt: d, status: 'pending' },
  { id: 'cli-manzinilodge', name: 'Manzini Lodge', address: 'Corner Kelly & Du Toit Street', city: 'Manzini', phone: '25053263', email: 'manzinilodge@swazi.net', notes: 'Urban Lodge & Restaurant. Alt phone: 25055382', createdAt: d, status: 'pending' },
  { id: 'cli-cafe189', name: 'Cafe 189 Coffee Shop & Restaurant', address: 'Central Manzini (M200)', city: 'Manzini', phone: '', email: '', notes: 'Dedicated Coffee Shop & Restaurant - walk-in listing', createdAt: d, status: 'pending' },
  { id: 'cli-peacecentre', name: 'Peace Centre Guesthouse', address: 'Plot No. 65, Donegal Road, Fairview', city: 'Manzini', phone: '25058056', email: 'peacecentreguesthouse@gmail.com', notes: 'Guesthouse & Daytime Gathering/Conference Venue. Alt phone: 78025786', createdAt: d, status: 'pending' },
  { id: 'cli-theplace', name: 'The Place Guest House', address: 'Matsapha', city: 'Matsapha', phone: '25184851', email: 'info@theplaceswazi.com', notes: 'Lodge & B&B. Website: theplaceswazi.com. Alt phone: 76022491', createdAt: d, status: 'pending' },
  { id: 'cli-premierhub', name: 'Premier Hotel The Hub', address: 'The Hub, Matsapha', city: 'Matsapha', phone: '25184330', email: 'info.thehub@premierhotels.co.za', notes: 'Corporate Hotel & Conference Hub. Website: premierhotels.co.za', createdAt: d, status: 'pending' },
  { id: 'cli-summerfield', name: 'Summerfield Botanical Garden & Luxury Resort', address: 'Fairydale, Matsapha', city: 'Matsapha', phone: '25184153', email: 'info@summerfieldssa.com', notes: 'Luxury Resort, Tea Garden & Cafe Spaces. Website: summerfieldssa.com. Alt phone: 76028530', createdAt: d, status: 'pending' },
  { id: 'cli-farside', name: 'Far Side Lodge', address: 'Matsapha', city: 'Matsapha', phone: '25184225', email: 'farsidelodge@swazi.net', notes: 'Country Lodge & Rest Stop', createdAt: d, status: 'pending' },
  { id: 'cli-pssn', name: 'PSSN Group / Corporate Offices', address: 'Phumelele Building, Matsapha Industrial Site', city: 'Matsapha', phone: '76686802', email: 'pssn@pssn.co.sz', notes: 'Corporate Offices - Client hospitality tea/snack service. Alt phone: 25185094', createdAt: d, status: 'pending' },
  { id: 'cli-construction', name: 'Construction Logistics Administration', address: 'Plot 175, 1st Avenue, Matsapha', city: 'Matsapha', phone: '25184952', email: 'reception@constructionlogistics.co.sz', notes: 'Corporate Industrial Headquarters', createdAt: d, status: 'pending' },
  { id: 'cli-mountaininn', name: 'Mountain Inn', address: 'Umsebe Crescent', city: 'Mbabane', phone: '24042773', email: 'info@mountaininn.sz', notes: 'Corporate Hotel & Restaurant. Website: mountaininn.sz', createdAt: d, status: 'pending' },
  { id: 'cli-royalswazi', name: 'Royal Swazi Spa / Lugogo Sun', address: 'Ezulwini Valley (Mbabane-Manzini Corridor)', city: 'Ezulwini', phone: '24165000', email: 'reservations@royalswazispa.co.sz', notes: 'Resort & Conference Center. Website: suninternational.com', createdAt: d, status: 'pending' },
  { id: 'cli-mantenga', name: 'Mantenga Lodge', address: 'Mantenga Drive, Ezulwini', city: 'Ezulwini', phone: '24162515', email: 'reception@mantengalodge.com', notes: 'Lodge & Scenic Terrace Coffee Spot. Website: mantengalodge.com', createdAt: d, status: 'pending' },
  { id: 'cli-muggbean', name: 'Mugg & Bean (The Gables)', address: 'The Gables Shopping Centre, Ezulwini', city: 'Ezulwini', phone: '24161263', email: 'management@muggandbean.co.za', notes: 'Branded High-Volume Coffee Shop & Bakery Pairing Spot. Website: muggandbean.co.za', createdAt: d, status: 'pending' },
  { id: 'cli-ezulwinigh', name: 'Ezulwini Guest House', address: '13 Majaha Close Goje, Lobamba/Ezulwini', city: 'Ezulwini', phone: '24162832', email: 'info@ezulwiniguesthouse.com', notes: 'B&B & Conference Hosting Spot. Website: ezulwiniguesthouse.com. Alt phone: 76020079', createdAt: d, status: 'pending' },
  { id: 'cli-eden', name: 'Eden Guest House', address: 'Mbabane', city: 'Mbabane', phone: '24046317', email: 'eden@swazi.net', notes: 'Bed & Breakfast', createdAt: d, status: 'pending' },
  { id: 'cli-immanuel', name: 'Immanuel Guesthouse', address: 'Mbabane', city: 'Mbabane', phone: '24048809', email: 'reservations@immanuelguesthouse.com', notes: 'Upmarket B&B. Website: immanuelguesthouse.com', createdAt: d, status: 'pending' },
  { id: 'cli-purpleolive', name: 'Purple Olive Guest House', address: '83 Riverside, Mbabane', city: 'Mbabane', phone: '24044687', email: 'info@purpleolive.co.sz', notes: 'Boutique Guesthouse & Function Venue. Website: purpleolive.co.sz. Alt phone: 76022145', createdAt: d, status: 'pending' },
  { id: 'cli-madonsa', name: 'Madonsa Guest House', address: 'Madonsa, Manzini Ext.', city: 'Manzini', phone: '25054565', email: 'info@madonsaguesthouse.co.sz', notes: 'Suburban Lodge & B&B. Alt phone: 76021211', createdAt: d, status: 'pending' },
];
export const initialStore: Store = {
  ingredients, recipes, orders,
  expenses: [],
  transactions: [], allocations: [{ id: 'alloc-1', name: 'Ingredients', mode: 'percent', value: 35 }, { id: 'alloc-2', name: 'Owner draw', mode: 'percent', value: 20 }, { id: 'alloc-3', name: 'Operating buffer', mode: 'fixed', value: 500 }],
  clients,
  settings: { bakeryName: 'Little Bliss Bakery', phone: '+268 621 0474', email: 'morrelloblue@gmail.com', address: 'P.O. Box 2700, Matsapha, Eswatini', currency: 'E', theme: 'light', nextInvoiceNumber: 42, hasSeenWelcome: false },
  auditLog: [],
  notifications: [],
  // New fields for additional features
  purchaseOrders: [],
  staffTasks: [],
  deliveryRoutes: [],
  whatsappMessages: [],
  backupRecords: [],
  productionSchedules: [],
  financialReports: [],
  reservations: [],
};
const KEY = 'little-bliss-store-v1';
/** One-time migration flag — see loadStore(). */
const YIELD_MIGRATED_KEY = 'little-bliss-yield-migrated';
const invoiceSequence = (value: string) => { const match = value.match(/(\d+)\s*$/); return match ? Number(match[1]) : 0; };
export const formatInvoiceNumber = (value: number) => `LBB ${String(value).padStart(5, '0')}`;
export const getNextInvoiceNumber = (store: Store) => Math.max(store.settings.nextInvoiceNumber || 1, ...store.orders.map(order => invoiceSequence(order.invoiceNumber || '')));
const normalizeOrder = (order: Partial<Order>, index: number): Order => ({
  id: order.id || `ord-${index + 1}`,
  invoiceNumber: order.invoiceNumber || formatInvoiceNumber(index + 1),
  orderNumber: order.orderNumber || '',
  customerName: order.customerName || '',
  customerAddress: order.customerAddress || '',
  customerCity: order.customerCity || '',
  phone: order.phone || '',
  orderDate: order.orderDate || d,
  dueDate: order.dueDate || order.orderDate || d,
  salesRep: order.salesRep || '',
  code: order.code || '',
  fob: order.fob || '',
  taxRate: Number(order.taxRate || 0),
  items: order.items || [],
  discount: Number(order.discount || 0),
  deliveryFee: Number(order.deliveryFee || 0),
  paymentStatus: order.paymentStatus === 'Part paid' ? 'Partially Paid' : order.paymentStatus || 'Unpaid',
  paymentMethod: order.paymentMethod || 'Cash',
  amountPaid: Number(order.amountPaid || 0),
  payments: order.payments || [],
  notes: order.notes || '',
  createdAt: order.createdAt || new Date().toISOString(),
  archived: order.archived || false,
  priority: order.priority || 'Normal',
});
export const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialStore;
    const parsed = JSON.parse(raw) as Partial<Store> & { products?: { id: string; name: string; category: string; description: string; image: string; batchYield: number; servingSize: string; laborCost: number; energyCost: number; packagingCost: number; wastagePercent: number; retailPriceDozen: number; wholesalePriceDozen: number; active: boolean; ovenTemp: string; bakeTimeMinutes: number }[]; recipes?: any[] };
    let normalizedOrders = (parsed.orders || []).map((order, index) => normalizeOrder(order, index));
    const maxExisting = Math.max(0, ...normalizedOrders.map(order => invoiceSequence(order.invoiceNumber)));
    let recipes = parsed.recipes || [];
    if (parsed.products && parsed.products.length && recipes.some((r: any) => r.productId)) {
      const productMap = new Map(parsed.products.map(p => [p.id, p]));
      recipes = recipes.map((r: any) => {
        const p = productMap.get(r.productId);
        if (!p) return r;
        return { ...p, ...r, id: r.id, productId: undefined };
      }).filter((r: any) => !r.productId || productMap.has(r.productId));
    }
    const removedRecipeIds = ['dark-choc', 'oatmeal-pies'];
    const productIdRemap: Record<string, string> = { 'dark-choc': 'dark-choc-chip', 'oatmeal-pies': 'oatmeal' };
    recipes = recipes.filter((r: any) => !removedRecipeIds.includes(r.id));
    // One-time only: these seed yields were corrected to 25. Applying the
    // override on every load silently reverted any yield the user edited later.
    if (!localStorage.getItem(YIELD_MIGRATED_KEY)) {
      const batchYieldOverrides: Record<string, number> = { 'oat-raisin': 25, 'choc-chip': 25 };
      recipes = recipes.map((r: any) => batchYieldOverrides[r.id] !== undefined ? { ...r, batchYield: batchYieldOverrides[r.id] } : r);
      try { localStorage.setItem(YIELD_MIGRATED_KEY, '1'); } catch { /* private mode */ }
    }
    // "Butter" in a recipe is Sunshine Margarine in this bakery. Rows still
    // pointing at the old butter ingredient rendered as a phantom "not in pantry"
    // line in the pre-bake check with no stock, no price and E0.00 of cost.
    // Idempotent: butter is dropped from the pantry, so a second load finds nothing.
    const pantry: Ingredient[] = parsed.ingredients || [];
    const margarine = pantry.some((i: any) => i.id === 'margarine');
    if (margarine) {
      recipes = recipes.map((r: any) => ({
        ...r,
        ingredients: (r.ingredients || []).map((row: any) => row.ingredientId === 'butter' ? { ...row, ingredientId: 'margarine' } : row),
      }));
      if (Array.isArray(parsed.reservations)) {
        parsed.reservations = parsed.reservations.map((res: any) => ({ ...res, lines: (res.lines || []).map((l: any) => l.ingredientId === 'butter' ? { ...l, ingredientId: 'margarine' } : l) }));
      }
      if (Array.isArray(parsed.transactions)) {
        parsed.transactions = parsed.transactions.map((t: any) => t.ingredientId === 'butter' ? { ...t, ingredientId: 'margarine' } : t);
      }
      const butter = pantry.find((i: any) => i.id === 'butter');
      if (butter) {
        // Fold the orphan butter record into margarine so no stock is stranded.
        parsed.ingredients = pantry.filter((i: any) => i.id !== 'butter').map((i: any) => i.id !== 'margarine' ? i : {
          ...i,
          currentStock: (i.currentStock || 0) + (butter.currentStock || 0),
          minimumStock: Math.max(i.minimumStock || 0, butter.minimumStock || 0),
          purchasePrice: i.purchasePrice || butter.purchasePrice,
          packSize: i.packSize || butter.packSize,
          supplier: i.supplier || butter.supplier,
        });
      }
    }
    normalizedOrders = normalizedOrders.map((o: any) => ({ ...o, items: (o.items || []).map((it: any) => ({ ...it, productId: productIdRemap[it.productId] || it.productId })) }));
    // costSnapshot is cost per individual piece. It is fully derived from the recipes
    // and re-derived on every save, so refreshing it on load is idempotent and corrects
    // existing orders once the recipes load.
    const ingredientSource: Ingredient[] = parsed.ingredients || initialStore.ingredients;
    normalizedOrders = normalizedOrders.map((o: any) => ({
      ...o,
      items: (o.items || []).map((it: any) => {
        const r: any = recipes.find((x: any) => x.id === it.productId);
        if (!r) return it;
        return { ...it, costSnapshot: roundCurrency(costPerUnit(r, ingredientSource)) };
      }),
    }));
    return {
      ...initialStore,
      ...parsed,
      recipes,
      orders: normalizedOrders,
      clients: (() => { const savedClients = parsed.clients || []; const savedIds = new Set(savedClients.map((c: any) => c.id)); const newDefaults = initialStore.clients.filter(c => !savedIds.has(c.id)); return [...newDefaults, ...savedClients]; })(),
      settings: { ...initialStore.settings, ...(parsed.settings || {}), nextInvoiceNumber: Math.max(Number(parsed.settings?.nextInvoiceNumber || 0), maxExisting + 1, 42) },
      auditLog: parsed.auditLog || [],
      notifications: parsed.notifications || [],
      reservations: parsed.reservations || [],
    };
  } catch { return initialStore; }
};
export const saveStore = (store: Store) => localStorage.setItem(KEY, JSON.stringify(store));
export const resetStore = () => localStorage.removeItem(KEY);

/* ─── UNITS ───
   An ingredient's price, pack size and stock are all expressed in ITS unit
   (g / kg / ml / L / each). A recipe row is expressed in the ROW's unit, which is
   typed by hand and routinely differs — a 5 kg bag of sugar measured out in grams.
   Every cost or stock figure that crosses that boundary has to convert first.
   convertQty returns null rather than a guess when a unit is unrecognised or the
   dimensions differ (each vs grams needs a density nobody has entered); callers
   must report that, never fall back to 0. */
export const UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', 'each'] as const;
export type AppUnit = (typeof UNIT_OPTIONS)[number];

const UNIT_ALIASES: Record<string, AppUnit> = {
  g: 'g', gm: 'g', gms: 'g', gr: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', mls: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml', cc: 'ml',
  l: 'L', lt: 'L', ltr: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L',
  each: 'each', ea: 'each', pc: 'each', pcs: 'each', piece: 'each', pieces: 'each', unit: 'each', units: 'each', count: 'each',
};

/** Free text (or a canonical unit) → canonical unit, or null when it isn't a unit we know. */
export const normalizeUnit = (unit: string | null | undefined): AppUnit | null => {
  const key = String(unit ?? '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(UNIT_ALIASES, key) ? UNIT_ALIASES[key] : null;
};

type UnitDimension = 'mass' | 'volume' | 'count';
const UNIT_SCALE: Record<AppUnit, { dimension: UnitDimension; factor: number }> = {
  g: { dimension: 'mass', factor: 1 },
  kg: { dimension: 'mass', factor: 1000 },
  ml: { dimension: 'volume', factor: 1 },
  L: { dimension: 'volume', factor: 1000 },
  each: { dimension: 'count', factor: 1 },
};

/**
 * Convert a quantity between units. Null means "cannot be expressed there" —
 * unknown unit or a different dimension. Never 0, never an approximation.
 */
export const convertQty = (quantity: number, from: string | null | undefined, to: string | null | undefined): number | null => {
  const source = normalizeUnit(from);
  const target = normalizeUnit(to);
  const value = Number(quantity);
  if (source === null || target === null || !Number.isFinite(value)) return null;
  if (UNIT_SCALE[source].dimension !== UNIT_SCALE[target].dimension) return null;
  return (value * UNIT_SCALE[source].factor) / UNIT_SCALE[target].factor;
};

export const unitCost = (i: Ingredient) => i.packSize > 0 && i.purchasePrice > 0 ? i.purchasePrice / i.packSize : null;

/** Why a recipe row cannot contribute a cost. */
export type RecipeRowIssue = 'missing' | 'unpriced' | 'unconvertible';
export type RecipeRowCost = {
  row: RecipeIngredient;
  ingredient: Ingredient | null;
  issue: RecipeRowIssue | null;
  /** Cost of this row, already converted into the ingredient's unit. Null when `issue` is set. */
  cost: number | null;
};

/** One recipe row costed, converted into the unit its ingredient is actually stocked in. */
export const costOfRow = (row: RecipeIngredient, all: Ingredient[]): RecipeRowCost => {
  const ingredient = all.find(i => i.id === row.ingredientId) || null;
  if (!ingredient) return { row, ingredient: null, issue: 'missing', cost: null };
  const perUnit = unitCost(ingredient);
  if (perUnit === null) return { row, ingredient, issue: 'unpriced', cost: null };
  const quantity = convertQty(row.quantity, row.unit, ingredient.unit);
  if (quantity === null) return { row, ingredient, issue: 'unconvertible', cost: null };
  return { row, ingredient, issue: null, cost: perUnit * quantity };
};

export const costRows = (r: Recipe, all: Ingredient[]): RecipeRowCost[] => r.ingredients.map(row => costOfRow(row, all));

export type RecipeCostIssues = { missing: string[]; unpriced: string[]; unconvertible: string[]; count: number };

/** Every reason a recipe cannot be fully costed, by ingredient name. */
export const recipeCostIssues = (r: Recipe, all: Ingredient[]): RecipeCostIssues => {
  const issues: RecipeCostIssues = { missing: [], unpriced: [], unconvertible: [], count: 0 };
  costRows(r, all).forEach(({ row, ingredient, issue }) => {
    if (!issue) return;
    issues[issue].push(ingredient?.name || row.ingredientId || 'Unknown ingredient');
  });
  issues.count = issues.missing.length + issues.unpriced.length + issues.unconvertible.length;
  return issues;
};

/** "2 missing · 1 not priced · 1 unit fix" — empty when every row can be costed. */
export const recipeIssueLabel = (issues: RecipeCostIssues): string =>
  [
    issues.missing.length ? `${issues.missing.length} missing` : '',
    issues.unpriced.length ? `${issues.unpriced.length} not priced` : '',
    issues.unconvertible.length ? `${issues.unconvertible.length} unit fix` : '',
  ].filter(Boolean).join(' · ');

/** Batch cost. Rows that cannot be costed contribute 0 — check recipeCostIssues() before presenting this as a complete figure. */
export const costOfRecipe = (r: Recipe, all: Ingredient[]): number =>
  costRows(r, all).reduce((sum, line) => sum + (line.cost ?? 0), 0);

/* ─── PIECES MODEL ───
   Order quantities are individual pieces. unitPrice is the price for one piece
   (retailPriceDozen / 12). batchYield is the number of pieces one batch produces.
   UNITS_PER_DOZEN is kept for the recipe pricing fields (retailPriceDozen /
   wholesalePriceDozen) and analytics "dozens" display only. */
export const UNITS_PER_DOZEN = 12;
/** Convert a piece quantity to the equivalent number of dozens (display only). */
export const unitsFor = (quantityInPieces: number): number => Number(quantityInPieces || 0);
export const batchesFor = (quantityInPieces: number, batchYield: number): number =>
  Math.ceil(Number(quantityInPieces || 0) / Math.max(1, Number(batchYield || 1)));
/** Cost to produce one sellable dozen (used for recipe profitability reporting). */
export const costPerDozen = (r: Recipe, all: Ingredient[]): number =>
  (costOfRecipe(r, all) / Math.max(1, Number(r.batchYield || 1))) * UNITS_PER_DOZEN;
/** Cost to produce one individual piece (used for order item costSnapshot). */
export const costPerUnit = (r: Recipe, all: Ingredient[]): number =>
  costOfRecipe(r, all) / Math.max(1, Number(r.batchYield || 1));

export const batchPlanForOrder = (order: Order, recipes: Recipe[]): BatchPlanLine[] => {
  const plan: BatchPlanLine[] = [];
  order.items.forEach(item => {
    const recipe = recipes.find(r => r.id === item.productId);
    if (!recipe) return;
    plan.push({ item, recipe, batches: batchesFor(item.quantity, recipe.batchYield) });
  });
  return plan;
};
/* ─── DEMAND ───
   What an order needs per ingredient, expressed in the ingredient's OWN unit so
   it can be compared with currentStock. Rows that cannot be expressed there are
   held back and reported rather than silently counted as zero. */
export type IngredientDemand = {
  ingredientId: string;
  ingredientName: string;
  recipeNames: string[];
  missing: boolean;
  /** Needed, in the ingredient's unit. Null when nothing in this order could be expressed there. */
  required: number | null;
  /** Raw recipe quantity, still in the row's own unit — only shown when `required` is null. */
  fallbackQuantity: number;
  fallbackUnit: string;
  /** Rows skipped because their unit cannot be converted into the ingredient's unit. */
  unconvertibleRows: number;
};

export const demandForOrder = (order: Order, recipes: Recipe[], ingredients: Ingredient[]): IngredientDemand[] => {
  const byId = new Map<string, IngredientDemand>();
  batchPlanForOrder(order, recipes).forEach(({ recipe, batches }) => {
    recipe.ingredients.forEach(row => {
      const ingredient = ingredients.find(i => i.id === row.ingredientId) || null;
      const quantity = row.quantity * batches;
      let entry = byId.get(row.ingredientId);
      if (!entry) {
        entry = {
          ingredientId: row.ingredientId,
          ingredientName: ingredient?.name || row.ingredientId,
          recipeNames: [],
          missing: !ingredient,
          required: null,
          fallbackQuantity: 0,
          fallbackUnit: row.unit,
          unconvertibleRows: 0,
        };
        byId.set(row.ingredientId, entry);
      }
      if (!entry.recipeNames.includes(recipe.name)) entry.recipeNames.push(recipe.name);
      entry.fallbackQuantity += quantity;
      if (!ingredient) return;
      const converted = convertQty(quantity, row.unit, ingredient.unit);
      if (converted === null) { entry.unconvertibleRows += 1; return; }
      entry.required = (entry.required ?? 0) + converted;
    });
  });
  return [...byId.values()];
};

/** Quantities in each ingredient's OWN unit — the only unit currentStock speaks. */
export const ingredientUsageForOrder = (order: Order, recipes: Recipe[], ingredients: Ingredient[]): Record<string, number> => {
  const usage: Record<string, number> = {};
  demandForOrder(order, recipes, ingredients).forEach(demand => {
    if (demand.missing || demand.required === null) return;
    usage[demand.ingredientId] = demand.required;
  });
  return usage;
};

export const ingredientUsageForOrders = (orders: Order[], recipes: Recipe[], ingredients: Ingredient[]): Record<string, number> => {
  const totalUsage: Record<string, number> = {};
  orders.forEach(order => {
    Object.entries(ingredientUsageForOrder(order, recipes, ingredients)).forEach(([id, qty]) => {
      totalUsage[id] = (totalUsage[id] || 0) + qty;
    });
  });
  return totalUsage;
};
export const projectedStock = (ingredients: Ingredient[], usage: Record<string, number>): { ingredient: Ingredient; current: number; used: number; remaining: number }[] => {
  return ingredients.map(i => ({
    ingredient: i,
    current: i.currentStock,
    used: usage[i.id] || 0,
    remaining: Math.max(0, i.currentStock - (usage[i.id] || 0)),
  }));
};
/* ─── RESERVATION ENGINE ───
   On hand → Reserved → Available to promise. Only 'reserved' batches hold stock;
   an 'issued' batch has already been deducted from the pantry, so counting it
   again would double-charge the same flour. */
const reservationId = () => `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const reservedQuantityByIngredient = (reservations: MaterialReservation[] = [], excludeOrderId?: string): Record<string, number> => {
  const totals: Record<string, number> = {};
  (reservations || []).forEach(reservation => {
    if (reservation.status !== 'reserved') return;
    if (excludeOrderId && reservation.orderId === excludeOrderId) return;
    reservation.lines.forEach(line => {
      totals[line.ingredientId] = (totals[line.ingredientId] || 0) + line.quantity;
    });
  });
  return totals;
};

/** Free stock that can still be promised to new orders. */
export const availableStock = (ingredient: Ingredient, reserved: Record<string, number>): number =>
  ingredient.currentStock - (reserved[ingredient.id] || 0);

export const availableStockMap = (ingredients: Ingredient[], reservations: MaterialReservation[] = [], excludeOrderId?: string): Record<string, number> => {
  const reserved = reservedQuantityByIngredient(reservations, excludeOrderId);
  const map: Record<string, number> = {};
  ingredients.forEach(i => { map[i.id] = availableStock(i, reserved); });
  return map;
};

export const reservationLinesForOrder = (order: Order, recipes: Recipe[], ingredients: Ingredient[]): ReservationLine[] => {
  const usage = ingredientUsageForOrder(order, recipes, ingredients);
  return Object.entries(usage)
    .map(([ingredientId, quantity]) => {
      const ingredient = ingredients.find(i => i.id === ingredientId);
      return { ingredientId, ingredientName: ingredient?.name || ingredientId, quantity, unit: ingredient?.unit || 'g' };
    })
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
};

export const reservationValue = (reservation: MaterialReservation | undefined, ingredients: Ingredient[]): number => {
  if (!reservation) return 0;
  return roundCurrency(reservation.lines.reduce((sum, line) => {
    const cost = unitCost(ingredients.find(i => i.id === line.ingredientId) as Ingredient);
    return sum + (cost === null ? 0 : cost * line.quantity);
  }, 0));
};

/** The one live reservation for an order, if any. Released/wasted rows are history. */
export const reservationForOrder = (reservations: MaterialReservation[] = [], orderId: string): MaterialReservation | undefined => {
  const live = (reservations || []).filter(r => r.orderId === orderId && (r.status === 'reserved' || r.status === 'issued'));
  return live.length ? live[live.length - 1] : undefined;
};

/** Create or refresh the hold behind an order. Issued batches are never rewritten. */
export const upsertReservation = (reservations: MaterialReservation[] = [], order: Order, recipes: Recipe[], ingredients: Ingredient[]): MaterialReservation[] => {
  const list = reservations || [];
  if (order.archived) return releaseReservations(list, order.id, 'Order cancelled');
  const live = reservationForOrder(list, order.id);
  const stamp = new Date().toISOString();
  const head = { orderNumber: order.invoiceNumber, customerName: order.customerName, dueDate: order.dueDate, updatedAt: stamp };
  if (live) {
    if (live.status === 'issued') return list;
    return list.map(r => r.id === live.id ? { ...r, ...head, lines: reservationLinesForOrder(order, recipes, ingredients) } : r);
  }
  const lines = reservationLinesForOrder(order, recipes, ingredients);
  if (!lines.length) return list;
  return [{ id: reservationId(), orderId: order.id, ...head, status: 'reserved' as ReservationStatus, lines, createdAt: stamp }, ...list];
};

/** Cancel path: an unbaked batch is simply released, a baked one is already spent. */
export const releaseReservations = (reservations: MaterialReservation[] = [], orderId: string, reason: string, wastedValue?: number): MaterialReservation[] => {
  const stamp = new Date().toISOString();
  return (reservations || []).map(r => {
    if (r.orderId !== orderId) return r;
    if (r.status === 'released' || r.status === 'wasted') return r;
    return { ...r, status: r.status === 'issued' ? 'wasted' : 'released', closedAt: stamp, updatedAt: stamp, closedReason: reason, wastedValue: r.status === 'issued' ? wastedValue : undefined };
  });
};

/** Bake day: the hold becomes a real draw on the pantry. */
export const issueReservation = (reservations: MaterialReservation[] = [], orderId: string): MaterialReservation[] => {
  const stamp = new Date().toISOString();
  return (reservations || []).map(r => r.orderId === orderId && r.status === 'reserved' ? { ...r, status: 'issued' as ReservationStatus, issuedAt: stamp, updatedAt: stamp } : r);
};

export const reservedBatchCount = (reservations: MaterialReservation[] = []): number =>
  (reservations || []).filter(r => r.status === 'reserved').length;

export const issuedBatchCount = (reservations: MaterialReservation[] = []): number =>
  (reservations || []).filter(r => r.status === 'issued').length;

/**
 * The pre-calculation that runs before a receipt is saved. Explodes the order into
 * batches, checks every ingredient against what is genuinely free to promise, and
 * reports shortfalls without ever blocking the sale.
 */
export const preBakePlan = (order: Order, ingredients: Ingredient[], recipes: Recipe[], reservations: MaterialReservation[] = []): PreBakePlan => {
  const plan = batchPlanForOrder(order, recipes);
  const demands = demandForOrder(order, recipes, ingredients);
  const reserved = reservedQuantityByIngredient(reservations, order.id);

  const lines: PreBakeLine[] = demands.map(demand => {
    const ingredient = demand.missing ? null : ingredients.find(i => i.id === demand.ingredientId) || null;
    const missing = !ingredient;
    // A pantry-less row has no unit to convert into, so we show the recipe's own
    // figure; everything stocked is shown in the ingredient's unit.
    const unit = ingredient?.unit || demand.fallbackUnit || 'g';
    const required = missing ? demand.fallbackQuantity : (demand.required ?? 0);
    const onHand = ingredient?.currentStock ?? 0;
    const reservedElsewhere = reserved[demand.ingredientId] || 0;
    const available = onHand - reservedElsewhere;
    const shortfall = Math.max(0, required - available);
    const cost = ingredient ? unitCost(ingredient) : null;
    return {
      ingredientId: demand.ingredientId,
      ingredientName: demand.ingredientName,
      required,
      onHand,
      reservedElsewhere,
      available,
      shortfall,
      sufficient: shortfall <= 0,
      missing,
      unitMismatch: demand.unconvertibleRows > 0,
      unconvertibleRows: demand.unconvertibleRows,
      unit,
      unitCost: cost,
      cost: roundCurrency((cost || 0) * required),
    };
  }).sort((a, b) => Number(a.sufficient) - Number(b.sufficient) || a.ingredientName.localeCompare(b.ingredientName));

  const batches = plan.map(({ recipe, item, batches: count }) => ({
    recipe,
    batches: count,
    ordered: item.quantity,
    surplus: Math.max(0, count * recipe.batchYield - unitsFor(item.quantity)),
  }));

  return {
    lines,
    batches,
    totalBatches: batches.reduce((sum, b) => sum + b.batches, 0),
    requiredCost: roundCurrency(lines.reduce((sum, l) => sum + l.cost, 0)),
    shortfallCost: roundCurrency(lines.reduce((sum, l) => sum + (l.unitCost === null ? 0 : l.unitCost * l.shortfall), 0)),
    shortageCount: lines.filter(l => !l.sufficient).length,
    unpricedCount: lines.filter(l => l.unitCost === null && !l.missing).length,
    missingCount: lines.filter(l => l.missing).length,
    unconvertibleCount: lines.filter(l => l.unconvertibleRows > 0).length,
    allAvailable: lines.every(l => l.sufficient),
  };
};

export const doughLeftover = (orders: Order[], recipes: Recipe[]): { recipe: Recipe; doughMade: number; doughUsed: number; leftover: number }[] => {
  /* doughMade stays in grams (doughWeight per batch), doughUsed is in PIECES so
     it can be divided by batchYield for "batches to bake", and leftover is the
     piece surplus. The previous version subtracted dozens from grams. */
  const usage: Record<string, { made: number; used: number; batches: number }> = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const recipe = recipes.find(r => r.id === item.productId);
      if (!recipe) return;
      if (!usage[item.productId]) usage[item.productId] = { made: 0, used: 0, batches: 0 };
      const batches = batchesFor(item.quantity, recipe.batchYield);
      usage[item.productId].batches += batches;
      usage[item.productId].made += recipe.doughWeight * batches;
      usage[item.productId].used += unitsFor(item.quantity);
    });
  });
  return recipes.filter(r => usage[r.id]).map(r => ({
    recipe: r,
    doughMade: usage[r.id].made,
    doughUsed: usage[r.id].used,
    leftover: Math.max(0, usage[r.id].batches * r.batchYield - usage[r.id].used),
  }));
};
export const roundCurrency = (n: number): number => Math.round(n * 100) / 100;

export const calculateOrderSubtotal = (items: OrderItem[]): number =>
  roundCurrency(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));

export const calculateOrderTaxable = (items: OrderItem[], discount: number, deliveryFee: number): number =>
  roundCurrency(calculateOrderSubtotal(items) - discount + deliveryFee);

export const calculateOrderTax = (items: OrderItem[], discount: number, deliveryFee: number, taxRate: number): number =>
  roundCurrency(calculateOrderTaxable(items, discount, deliveryFee) * (taxRate / 100));

export const calculateOrderTotal = (items: OrderItem[], discount: number, deliveryFee: number, taxRate: number): number =>
  roundCurrency(calculateOrderTaxable(items, discount, deliveryFee) + calculateOrderTax(items, discount, deliveryFee, taxRate));

export const calculateOrderCost = (items: OrderItem[]): number =>
  roundCurrency(items.reduce((sum, item) => sum + item.quantity * item.costSnapshot, 0));

/* ─── REVENUE BASIS ───
   Three different revenue figures were in circulation: line value minus discount
   (Overview, Reports), the full invoice total including delivery and tax
   (Financial Reports, Sales Analytics) and sum of items ignoring the discount.
   Every reporting page now reads NET SALES from here: what the bakery earned for
   product, after the discount it agreed, before the delivery and tax it merely
   collected on someone else's behalf. Delivery and tax stay visible on the
   invoice and in their own order lines — they are not product revenue, and the
   cost/margin model is built on product revenue. */
export const calculateOrderRevenue = (items: OrderItem[], discount: number): number =>
  roundCurrency(calculateOrderSubtotal(items) - discount);

export const orderRevenue = (order: Order): number => calculateOrderRevenue(order.items, order.discount);

export const calculateOrderOutstanding = (items: OrderItem[], discount: number, deliveryFee: number, taxRate: number, amountPaid: number): number =>
  Math.max(0, roundCurrency(calculateOrderTotal(items, discount, deliveryFee, taxRate) - amountPaid));

// ─── Revenue period filtering ───
/** YYYY-MM-DD for a Date, read in LOCAL time. */
export const localDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Parse a stored YYYY-MM-DD as a LOCAL date. new Date('2026-09-30') is UTC
 * midnight, which is the previous day in every timezone behind UTC — enough to
 * move a sale into the wrong month and a bake into the wrong day.
 */
export const parseLocalDate = (value: string | null | undefined): Date => {
  const parts = String(value ?? '').slice(0, 10).split('-').map(Number);
  return new Date(parts[0] || 1970, (parts[1] || 1) - 1, parts[2] || 1);
};

/** The last day of a month, safe for December (month 12 + 1 rolls over on its own). */
export const monthKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export type RevenuePeriod = 'today' | '2days' | 'week' | 'month' | 'year' | 'lifetime';
export const REVENUE_PERIODS: { value: RevenuePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '2days', label: '2 days' },
  { value: 'week', label: '1 week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'lifetime', label: 'Lifetime' },
];
export const revenuePeriodLabel = (period: string): string =>
  REVENUE_PERIODS.find(p => p.value === period)?.label || 'Lifetime';

export const inRevenuePeriod = (dateStr: string, period: RevenuePeriod): boolean => {
  // Parse YYYY-MM-DD as a LOCAL date — new Date('YYYY-MM-DD') is UTC midnight and
  // shifts a whole day in timezones behind UTC.
  const d = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (period === 'today') return d.getTime() === today.getTime();
  if (period === '2days' || period === 'week') {
    const from = new Date(today);
    from.setDate(from.getDate() - (period === '2days' ? 1 : 6));
    return d.getTime() >= from.getTime();
  }
  if (period === 'month') return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  if (period === 'year') return d.getFullYear() === today.getFullYear();
  return true; // lifetime
};

// Orders that count toward revenue: excludes disconnected receipts, archived-unpaid
// invoices, and anything outside the selected period. Never touches stock data.
export const revenueOrders = (orders: Order[], period: RevenuePeriod = 'lifetime'): Order[] =>
  orders.filter(o =>
    !o.excludeFromRevenue &&
    !(o.archived && o.paymentStatus !== 'Paid') &&
    inRevenuePeriod(o.orderDate, period)
  );

export const revenueExpenses = <T extends { date: string }>(items: T[], period: RevenuePeriod): T[] =>
  items.filter(e => inRevenuePeriod(e.date, period));


export const today = () => new Date().toISOString().slice(0, 10);
export const createAuditEntry = (section: string, action: string, entityId: string, entityName: string, details: string, changedBy: string = 'User'): AuditLogEntry => ({
  id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  timestamp: new Date().toISOString(),
  section, action, entityId, entityName, details, changedBy,
});
export const createNotification = (title: string, body: string, section: string, entityId?: string): Notification => ({
  id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  timestamp: new Date().toISOString(),
  title, body, section, read: false, entityId,
});
export const unreadCount = (notifications: Notification[]) => notifications.filter(n => !n.read).length;

// Sales Analytics Functions
/* Reads the shared report helpers rather than re-deriving them, so this page and
   the Reports page can never quote different revenue for the same orders. The
   12-month trend is deliberately period-independent: it is the trend's own
   context, not a total of the selected period. */
export const calculateSalesAnalytics = (orders: Order[], recipes: Recipe[], period: string = 'month'): SalesAnalytics => {
  const rp: RevenuePeriod = period === 'all' ? 'lifetime' : (period as RevenuePeriod);
  const filteredOrders = revenueOrders(orders, rp);

  const totals = periodTotals(filteredOrders);

  const topProducts = salesByProduct(filteredOrders, recipes)
    .slice(0, 10)
    .map(line => ({ productId: line.productId, productName: line.productName, quantity: line.dozens, units: line.units, revenue: line.revenue }));

  // Lifetime sales, bucketed into the last 12 calendar months.
  const monthlyTrend = reportMonthlyTrend(revenueOrders(orders, 'lifetime'), [], 12)
    .map(point => ({ month: point.label, revenue: point.revenue }));

  const categoryBreakdown = salesByCategory(filteredOrders, recipes)
    .map(line => ({ category: line.category, revenue: line.revenue }));

  return {
    period,
    totalRevenue: totals.revenue,
    totalOrders: totals.orders,
    averageOrderValue: totals.averageOrderValue,
    topProducts,
    monthlyTrend,
    categoryBreakdown,
  };
};

/* ─── REPORT CALCULATIONS ───
   One place for every figure a report shows. Reports, Sales Analytics and
   Financial Reports all read from here, so a number can never quietly disagree
   with itself between two screens. Nothing here invents data: each helper only
   reshapes what is already in the store, and each returns an empty result when
   there is nothing to reshape. */
export type PeriodTotals = {
  orders: number;
  revenue: number;
  costs: number;
  grossProfit: number;
  /** Null — not zero — when there is no revenue to take a margin of. */
  grossMargin: number | null;
  expenses: number;
  profit: number;
  profitMargin: number | null;
  received: number;
  outstanding: number;
  dozensSold: number;
  unitsSold: number;
  averageOrderValue: number;
};

const marginOf = (part: number, whole: number): number | null => (whole > 0 ? (part / whole) * 100 : null);

export const periodTotals = (orders: Order[], expenses: Expense[] = []): PeriodTotals => {
  const revenue = roundCurrency(orders.reduce((sum, o) => sum + orderRevenue(o), 0));
  const costs = roundCurrency(orders.reduce((sum, o) => sum + calculateOrderCost(o.items), 0));
  const expensesTotal = roundCurrency(expenses.reduce((sum, e) => sum + e.amount, 0));
  const received = roundCurrency(orders.reduce((sum, o) => sum + (o.amountPaid || 0), 0));
  const dozensSold = roundCurrency(orders.reduce((sum, o) => sum + o.items.reduce((a, i) => a + i.quantity, 0), 0));
  const grossProfit = roundCurrency(revenue - costs);
  const profit = roundCurrency(grossProfit - expensesTotal);
  return {
    orders: orders.length,
    revenue,
    costs,
    grossProfit,
    grossMargin: marginOf(grossProfit, revenue),
    expenses: expensesTotal,
    profit,
    profitMargin: marginOf(profit, revenue),
    received,
    outstanding: roundCurrency(Math.max(0, revenue - received)),
    dozensSold,
    unitsSold: unitsFor(dozensSold),
    averageOrderValue: orders.length ? roundCurrency(revenue / orders.length) : 0,
  };
};

/** The reporting period's own orders and expenses, under the store's revenue rules. */
export const periodScope = (store: Pick<Store, 'orders' | 'expenses'>, period: RevenuePeriod) => {
  const orders = revenueOrders(store.orders, period);
  const expenses = store.expenses.filter(e => inRevenuePeriod(e.date, period));
  return { orders, expenses, totals: periodTotals(orders, expenses) };
};

export type ProductSalesLine = {
  productId: string;
  productName: string;
  category: string;
  orders: number;
  dozens: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  /** Null when nothing was sold in the period — there is no margin to quote. */
  margin: number | null;
};

/** Sales by product, best first. Quantities are dozens, as entered on the order. */
export const salesByProduct = (orders: Order[], recipes: Recipe[]): ProductSalesLine[] => {
  const lines = new Map<string, ProductSalesLine & { orderIds: Set<string> }>();
  orders.forEach(order => {
    order.items.forEach(item => {
      const recipe = recipes.find(r => r.id === item.productId);
      const existing = lines.get(item.productId) || {
        productId: item.productId,
        productName: recipe?.name || 'Unknown product',
        category: recipe?.category || 'Uncategorised',
        orders: 0, dozens: 0, units: 0, revenue: 0, cost: 0, profit: 0, margin: null,
        orderIds: new Set<string>(),
      };
      existing.dozens += (item.quantity || 0) / UNITS_PER_DOZEN;
      existing.units += item.quantity || 0;
      existing.revenue = roundCurrency(existing.revenue + item.quantity * item.unitPrice);
      existing.cost = roundCurrency(existing.cost + item.quantity * (item.costSnapshot || 0));
      existing.orderIds.add(order.id);
      lines.set(item.productId, existing);
    });
  });
  return [...lines.values()]
    .map(({ orderIds, ...line }) => ({
      ...line,
      orders: orderIds.size,
      profit: roundCurrency(line.revenue - line.cost),
      margin: marginOf(roundCurrency(line.revenue - line.cost), line.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue);
};

export type CategorySalesLine = { category: string; revenue: number; dozens: number; products: number };

export const salesByCategory = (orders: Order[], recipes: Recipe[]): CategorySalesLine[] => {
  const lines = new Map<string, CategorySalesLine & { productIds: Set<string> }>();
  orders.forEach(order => {
    order.items.forEach(item => {
      const recipe = recipes.find(r => r.id === item.productId);
      if (!recipe) return;
      const existing = lines.get(recipe.category) || { category: recipe.category, revenue: 0, dozens: 0, products: 0, productIds: new Set<string>() };
      existing.dozens += (item.quantity || 0) / UNITS_PER_DOZEN;
      existing.revenue = roundCurrency(existing.revenue + item.quantity * item.unitPrice);
      existing.productIds.add(item.productId);
      lines.set(recipe.category, existing);
    });
  });
  return [...lines.values()]
    .map(({ productIds, ...line }) => ({ ...line, products: productIds.size }))
    .sort((a, b) => b.revenue - a.revenue);
};

export type ClientSalesLine = {
  customerName: string;
  orders: number;
  revenue: number;
  averageOrderValue: number;
  firstOrderDate: string;
  lastOrderDate: string;
};

export const salesByClient = (orders: Order[]): ClientSalesLine[] => {
  const lines = new Map<string, ClientSalesLine>();
  orders.forEach(order => {
    const key = order.customerName || 'Unnamed customer';
    const existing = lines.get(key) || {
      customerName: key, orders: 0, revenue: 0, averageOrderValue: 0,
      firstOrderDate: order.orderDate, lastOrderDate: order.orderDate,
    };
    existing.orders += 1;
    existing.revenue = roundCurrency(existing.revenue + orderRevenue(order));
    if (order.orderDate < existing.firstOrderDate) existing.firstOrderDate = order.orderDate;
    if (order.orderDate > existing.lastOrderDate) existing.lastOrderDate = order.orderDate;
    lines.set(key, existing);
  });
  return [...lines.values()]
    .map(line => ({ ...line, averageOrderValue: roundCurrency(line.orders ? line.revenue / line.orders : 0) }))
    .sort((a, b) => b.revenue - a.revenue);
};

export type TrendPoint = {
  key: string;
  label: string;
  revenue: number;
  costs: number;
  expenses: number;
  profit: number;
  received: number;
  orders: number;
};

/** Net sales and order count for the last `months` calendar months, oldest first. */
export const reportMonthlyTrend = (orders: Order[], expenses: Expense[], months: number = 12): TrendPoint[] => {
  const now = new Date();
  const buckets: TrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(anchor);
    const label = anchor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    buckets.push({ key, label, revenue: 0, costs: 0, expenses: 0, profit: 0, received: 0, orders: 0 });
  }
  const byMonth = new Map(buckets.map(b => [b.key, b]));
  const revenueOrdersOnly = revenueOrders(orders, 'lifetime');
  revenueOrdersOnly.forEach(order => {
    const bucket = byMonth.get(monthKey(parseLocalDate(order.orderDate)));
    if (!bucket) return;
    bucket.revenue = roundCurrency(bucket.revenue + orderRevenue(order));
    bucket.costs = roundCurrency(bucket.costs + calculateOrderCost(order.items));
    bucket.received = roundCurrency(bucket.received + (order.amountPaid || 0));
    bucket.orders += 1;
  });
  expenses.forEach(expense => {
    const bucket = byMonth.get(monthKey(parseLocalDate(expense.date)));
    if (!bucket) return;
    bucket.expenses = roundCurrency(bucket.expenses + expense.amount);
  });
  return buckets.map(b => ({ ...b, profit: roundCurrency(b.revenue - b.costs - b.expenses) }));
};

/** Net sales and order count for the last `days` days, oldest first. */
export const dailyTrend = (orders: Order[], expenses: Expense[], days: number = 30): TrendPoint[] => {
  const buckets: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const anchor = new Date();
    anchor.setHours(0, 0, 0, 0);
    anchor.setDate(anchor.getDate() - i);
    const key = localDateKey(anchor);
    buckets.push({ key, label: anchor.toLocaleDateString('en-SZ', { day: '2-digit', month: 'short' }), revenue: 0, costs: 0, expenses: 0, profit: 0, received: 0, orders: 0 });
  }
  const byDay = new Map(buckets.map(b => [b.key, b]));
  revenueOrders(orders, 'lifetime').forEach(order => {
    const bucket = byDay.get(localDateKey(parseLocalDate(order.orderDate)));
    if (!bucket) return;
    bucket.revenue = roundCurrency(bucket.revenue + orderRevenue(order));
    bucket.costs = roundCurrency(bucket.costs + calculateOrderCost(order.items));
    bucket.received = roundCurrency(bucket.received + (order.amountPaid || 0));
    bucket.orders += 1;
  });
  expenses.forEach(expense => {
    const bucket = byDay.get(localDateKey(parseLocalDate(expense.date)));
    if (!bucket) return;
    bucket.expenses = roundCurrency(bucket.expenses + expense.amount);
  });
  return buckets.map(b => ({ ...b, profit: roundCurrency(b.revenue - b.costs - b.expenses) }));
};

/**
 * A trend whose granularity matches the period the reader chose: days for a week
 * or less, months for anything longer. Short periods on a monthly axis either
 * collapse into a single bar or hide every sale.
 */
export const trendForPeriod = (orders: Order[], expenses: Expense[], period: RevenuePeriod): TrendPoint[] => {
  if (period === 'today' || period === '2days') return dailyTrend(orders, expenses, 14);
  if (period === 'week') return dailyTrend(orders, expenses, 30);
  if (period === 'year' || period === 'lifetime') return reportMonthlyTrend(orders, expenses, 12);
  return dailyTrend(orders, expenses, 30);
};

/** Production demand per product: what the period's orders require the bakery to bake. */
export type ProductionLine = {
  recipeId: string;
  recipeName: string;
  category: string;
  orders: number;
  dozens: number;
  units: number;
  batches: number;
  revenue: number;
  lastDueDate: string;
};

export const productionByProduct = (orders: Order[], recipes: Recipe[]): ProductionLine[] => {
  const lines = new Map<string, ProductionLine & { orderIds: Set<string> }>();
  orders.forEach(order => {
    order.items.forEach(item => {
      const recipe = recipes.find(r => r.id === item.productId);
      if (!recipe) return;
      const existing = lines.get(item.productId) || {
        recipeId: item.productId, recipeName: recipe.name, category: recipe.category,
        orders: 0, dozens: 0, units: 0, batches: 0, revenue: 0, lastDueDate: order.dueDate, orderIds: new Set<string>(),
      };
      existing.dozens += (item.quantity || 0) / UNITS_PER_DOZEN;
      existing.units += item.quantity || 0;
      existing.batches += batchesFor(item.quantity, recipe.batchYield);
      existing.revenue = roundCurrency(existing.revenue + item.quantity * item.unitPrice);
      if (order.dueDate > existing.lastDueDate) existing.lastDueDate = order.dueDate;
      existing.orderIds.add(order.id);
      lines.set(item.productId, existing);
    });
  });
  return [...lines.values()]
    .map(({ orderIds, ...line }) => ({ ...line, orders: orderIds.size }))
    .sort((a, b) => b.units - a.units);
};

export type CustomerReport = {
  clientsOnFile: number;
  newInPeriod: number;
  activeInPeriod: number;
  repeatInPeriod: number;
  oneTimeInPeriod: number;
  repeatRate: number | null;
  lifetimeRevenue: number;
  periodRevenue: number;
  clients: (ClientSalesLine & { lifetimeOrders: number; newInPeriod: boolean; repeat: boolean })[];
};

/** Client activity, split by what the period's orders say and by the client file itself. */
export const customerReport = (orders: Order[], clientFile: Client[], period: RevenuePeriod): CustomerReport => {
  const periodOrders = revenueOrders(orders, period);
  const lifetime = salesByClient(revenueOrders(orders, 'lifetime'));
  const lifetimeByName = new Map(lifetime.map(line => [line.customerName, line]));
  const inPeriod = salesByClient(periodOrders);

  const active: CustomerReport['clients'] = inPeriod.map(line => {
    const lifetimeLine = lifetimeByName.get(line.customerName);
    return {
      ...line,
      lifetimeOrders: lifetimeLine?.orders || line.orders,
      newInPeriod: clientFile.some(c => c.name === line.customerName && inRevenuePeriod(c.createdAt, period)),
      repeat: (lifetimeLine?.orders || line.orders) > 1,
    };
  });

  const repeatInPeriod = active.filter(c => c.lifetimeOrders > 1).length;
  return {
    clientsOnFile: clientFile.length,
    newInPeriod: clientFile.filter(c => inRevenuePeriod(c.createdAt, period)).length,
    activeInPeriod: active.length,
    repeatInPeriod,
    oneTimeInPeriod: active.length - repeatInPeriod,
    repeatRate: marginOf(repeatInPeriod, active.length),
    lifetimeRevenue: roundCurrency(lifetime.reduce((sum, l) => sum + l.revenue, 0)),
    periodRevenue: roundCurrency(active.reduce((sum, c) => sum + c.revenue, 0)),
    clients: active,
  };
};

export type StockStatus = 'out' | 'low' | 'watch' | 'ok';

export type StockReportLine = {
  ingredientId: string;
  name: string;
  category: string;
  supplier: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  /** Stock value at the ingredient's own unit cost. Zero when it has no price. */
  value: number;
  status: StockStatus;
  /** Current stock as a share of the minimum; null when no minimum is set. */
  ratioToMinimum: number | null;
};

/** Read-only view of the pantry. Reports it; never adjusts, never reorders. */
export const stockReport = (ingredients: Ingredient[]): StockReportLine[] => {
  const severity: Record<StockStatus, number> = { out: 0, low: 1, watch: 2, ok: 3 };
  return ingredients.map(i => {
    const cost = unitCost(i);
    const ratio = i.minimumStock > 0 ? i.currentStock / i.minimumStock : null;
    const status: StockStatus = i.currentStock <= 0 ? 'out'
      : i.minimumStock <= 0 ? 'ok'
      : i.currentStock <= i.minimumStock ? 'low'
      : i.currentStock <= i.minimumStock * 1.5 ? 'watch'
      : 'ok';
    return {
      ingredientId: i.id, name: i.name, category: i.category, supplier: i.supplier, unit: i.unit,
      currentStock: i.currentStock, minimumStock: i.minimumStock,
      value: roundCurrency((cost || 0) * i.currentStock),
      status, ratioToMinimum: ratio,
    };
  }).sort((a, b) => severity[a.status] - severity[b.status]
    || (a.ratioToMinimum ?? Infinity) - (b.ratioToMinimum ?? Infinity)
    || a.name.localeCompare(b.name));
};

/** Stock movements already recorded in the pantry log, filtered to the period. */
export type MovementLine = {
  transactionId: string;
  ingredientId: string;
  ingredientName: string;
  date: string;
  type: string;
  quantity: number;
  unit: string;
  note: string;
};

export const stockMovement = (transactions: InventoryTransaction[], ingredients: Ingredient[], period: RevenuePeriod): MovementLine[] =>
  (transactions || [])
    .filter(t => inRevenuePeriod(t.date, period))
    .map(t => ({
      transactionId: t.id,
      ingredientId: t.ingredientId,
      ingredientName: ingredients.find(i => i.id === t.ingredientId)?.name || t.ingredientId,
      date: t.date,
      type: t.type,
      quantity: t.quantity || 0,
      unit: ingredients.find(i => i.id === t.ingredientId)?.unit || '',
      note: t.note || '',
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

/** What the period's orders will consume of each ingredient, in the ingredient's own unit. */
export type IngredientUsageLine = {
  ingredientId: string;
  ingredientName: string;
  category: string;
  unit: string;
  quantity: number;
  cost: number;
  recipes: string[];
};

export const ingredientConsumption = (orders: Order[], recipes: Recipe[], ingredients: Ingredient[]): IngredientUsageLine[] => {
  const usage = ingredientUsageForOrders(orders, recipes, ingredients);
  const rows: IngredientUsageLine[] = [];
  Object.entries(usage).forEach(([ingredientId, quantity]) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return;
    const cost = unitCost(ingredient);
    rows.push({
      ingredientId,
      ingredientName: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      quantity: roundCurrency(quantity),
      cost: roundCurrency((cost || 0) * quantity),
      recipes: recipes.filter(r => r.ingredients.some(row => row.ingredientId === ingredientId)).map(r => r.name),
    });
  });
  return rows.sort((a, b) => b.quantity - a.quantity);
};

export type ExpenseCategoryLine = { category: string; amount: number; share: number | null; count: number };

export const expenseBreakdown = (expenses: Expense[]): ExpenseCategoryLine[] => {
  const total = roundCurrency(expenses.reduce((sum, e) => sum + e.amount, 0));
  const lines = new Map<string, ExpenseCategoryLine>();
  expenses.forEach(e => {
    const existing = lines.get(e.category || 'Uncategorised') || { category: e.category || 'Uncategorised', amount: 0, share: null, count: 0 };
    existing.amount = roundCurrency(existing.amount + e.amount);
    existing.count += 1;
    lines.set(e.category || 'Uncategorised', existing);
  });
  return [...lines.values()]
    .map(line => ({ ...line, share: marginOf(line.amount, total) }))
    .sort((a, b) => b.amount - a.amount);
};

export type RecipeProfitability = {
  recipe: Recipe;
  /** Ingredient cost of one dozen, on the app's existing costPerDozen definition. */
  costPerDozen: number;
  revenue: number;
  profit: number;
  /** Null when the product has no selling price yet — a loss, not a 0% margin. */
  margin: number | null;
  issues: RecipeCostIssues;
  /** False when a row could not be costed, so the cost is a floor, not the truth. */
  costComplete: boolean;
};

/**
 * The app's one margin formula, used by the Profit Margin page, the Reports
 * profitability panel and the calculator so the three can never disagree.
 * Null — not zero — when there is no revenue to take a margin of: a product with
 * no selling price is a loss, and printing 0.0% for it hides that.
 */
export const marginFor = (revenue: number, cost: number): number | null => {
  const selling = Number(revenue) || 0;
  return selling > 0 ? ((selling - (Number(cost) || 0)) / selling) * 100 : null;
};

/**
 * The single profitability definition used by Reports, the Profit Margin page and
 * the printed documents: revenue is the selling price of a dozen, cost is
 * costPerDozen, profit is the difference and margin is profit over revenue.
 * Labor, energy and packaging are deliberately excluded — they are zero
 * everywhere in this app and no cost formula has ever included them.
 */
export const recipeProfitability = (recipe: Recipe, ingredients: Ingredient[]): RecipeProfitability => {
  const revenue = Number(recipe.retailPriceDozen || 0);
  const costPerDozenValue = costPerDozen(recipe, ingredients);
  const issues = recipeCostIssues(recipe, ingredients);
  const profit = roundCurrency(revenue - costPerDozenValue);
  return {
    recipe,
    costPerDozen: costPerDozenValue,
    revenue,
    profit,
    margin: marginFor(revenue, costPerDozenValue),
    issues,
    costComplete: issues.count === 0,
  };
};

export const allRecipeProfitability = (recipes: Recipe[], ingredients: Ingredient[]): RecipeProfitability[] =>
  recipes.map(r => recipeProfitability(r, ingredients));

// Production Schedule Functions
/* Production is derived live from the orders already in the store — nothing is
   written back, so placing an order needs no calendar step of its own. Two date
   bugs used to hide today's bake: new Date('YYYY-MM-DD') is UTC midnight (a
   different local day west of Greenwich), and daysUntilDue > 0 dropped an order
   due today altogether. */
export const generateProductionSchedule = (orders: Order[], recipes: Recipe[]): ProductionSchedule[] => {
  const schedules: ProductionSchedule[] = [];
  const today = parseLocalDate(localDateKey(new Date()));

  orders.filter(o => o.paymentStatus !== 'Paid' && !o.archived).forEach(order => {
    const dueDate = parseLocalDate(order.dueDate);
    const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue >= 0 && daysUntilDue <= 7) {
      order.items.forEach(item => {
        const recipe = recipes.find(r => r.id === item.productId);
        if (recipe) {
          schedules.push({
            id: `sched-${order.id}-${item.productId}`,
            date: localDateKey(dueDate),
            recipeId: recipe.id,
            recipeName: recipe.name,
            quantity: item.quantity,
            orderId: order.id,
            status: 'scheduled',
          });
        }
      });
    }
  });

  return schedules.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.recipeName.localeCompare(b.recipeName));
};

// Automatic Reordering Functions
export const generatePurchaseOrders = (ingredients: Ingredient[]): PurchaseOrder[] => {
  const orders: PurchaseOrder[] = [];
  const today = new Date().toISOString().slice(0, 10);
  
  ingredients.forEach(ing => {
    if (ing.currentStock <= ing.minimumStock) {
      const reorderQuantity = ing.minimumStock * 2 - ing.currentStock;
      const estimatedCost = (reorderQuantity / ing.packSize) * ing.purchasePrice;
      
      orders.push({
        id: `po-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ingredientId: ing.id,
        ingredientName: ing.name,
        supplier: ing.supplier,
        quantity: reorderQuantity,
        unit: ing.unit,
        estimatedCost,
        status: 'pending',
        orderDate: today,
        notes: `Auto-generated: Stock at ${ing.currentStock}${ing.unit} is at or below minimum of ${ing.minimumStock}${ing.unit}`,
      });
    }
  });

  return orders;
};

// Customer Analytics Functions
export const getCustomerAnalytics = (orders: Order[], clients: Client[]) => {
  const customerStats = new Map<string, {
    totalOrders: number;
    totalSpent: number;
    avgOrderValue: number;
    firstOrderDate: string;
    lastOrderDate: string;
    purchaseFrequency: number; // days between orders
  }>();

  orders.filter(o => !o.excludeFromRevenue).forEach(order => {
    const customerId = order.customerName; // Using customer name as ID for now
    const total = calculateOrderTotal(order.items, order.discount, order.deliveryFee, order.taxRate);
    
    if (!customerStats.has(customerId)) {
      customerStats.set(customerId, {
        totalOrders: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        firstOrderDate: order.orderDate,
        lastOrderDate: order.orderDate,
        purchaseFrequency: 0,
      });
    }

    const stats = customerStats.get(customerId)!;
    stats.totalOrders += 1;
    stats.totalSpent += total;
    stats.avgOrderValue = stats.totalSpent / stats.totalOrders;
    
    if (order.orderDate < stats.firstOrderDate) {
      stats.firstOrderDate = order.orderDate;
    }
    if (order.orderDate > stats.lastOrderDate) {
      stats.lastOrderDate = order.orderDate;
    }
  });

  // Calculate purchase frequency (days between orders)
  customerStats.forEach((stats, customerId) => {
    if (stats.totalOrders > 1) {
      const firstDate = new Date(stats.firstOrderDate);
      const lastDate = new Date(stats.lastOrderDate);
      const daysDiff = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      stats.purchaseFrequency = Math.floor(daysDiff / (stats.totalOrders - 1));
    }
  });

  return Array.from(customerStats.entries()).map(([customerName, stats]) => ({
    customerName,
    ...stats,
  })).sort((a, b) => b.totalSpent - a.totalSpent);
};

// Cash Flow Projection Functions
export const getCashFlowProjection = (orders: Order[], expenses: Expense[], days: number = 90) => {
  const today = new Date();
  const projections: Array<{ date: string; inflow: number; outflow: number; net: number; cumulative: number }> = [];
  let cumulative = 0;

  for (let i = 0; i <= days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    // Calculate expected inflows from orders due on this date
    const inflow = orders
      .filter(order => order.dueDate === dateStr && order.paymentStatus !== 'Paid')
      .reduce((sum, order) => {
        const total = calculateOrderTotal(order.items, order.discount, order.deliveryFee, order.taxRate);
        const outstanding = total - order.amountPaid;
        return sum + Math.max(0, outstanding);
      }, 0);

    // Calculate expected outflows from expenses on this date
    const outflow = expenses
      .filter(expense => expense.date === dateStr)
      .reduce((sum, expense) => sum + expense.amount, 0);

    const net = inflow - outflow;
    cumulative += net;

    projections.push({
      date: dateStr,
      inflow: roundCurrency(inflow),
      outflow: roundCurrency(outflow),
      net: roundCurrency(net),
      cumulative: roundCurrency(cumulative),
    });
  }

  return projections;
};

// Profitability Analysis Functions
export const getRecipeProfitability = (recipes: Recipe[], ingredients: Ingredient[], orders: Order[]) => {
  const counted = orders.filter(o => !o.excludeFromRevenue);
  return recipes.map(recipe => {
    const cost = costOfRecipe(recipe, ingredients);
    const totalRevenue = counted
      .filter(order => order.items.some(item => item.productId === recipe.id))
      .reduce((sum, order) => {
        const item = order.items.find(i => i.productId === recipe.id);
        return sum + (item ? item.quantity * item.unitPrice : 0);
      }, 0);
    
    const totalQuantity = counted
      .filter(order => order.items.some(item => item.productId === recipe.id))
      .reduce((sum, order) => {
        const item = order.items.find(i => i.productId === recipe.id);
        return sum + (item ? item.quantity : 0);
      }, 0);

    const totalCost = totalQuantity > 0 ? (cost / Math.max(1, recipe.batchYield)) * totalQuantity : 0;
    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      recipe,
      costPerUnit: cost / Math.max(1, recipe.batchYield),
      retailPricePerUnit: recipe.retailPriceDozen / UNITS_PER_DOZEN,
      totalRevenue,
      totalCost,
      profit,
      profitMargin,
      totalQuantity,
    };
  }).sort((a, b) => b.profit - a.profit);
};

// Batch Optimization Functions
export const getBatchOptimization = (orders: Order[], recipes: Recipe[]) => {
  const recipeRequirements = new Map<string, number>();

  orders.forEach(order => {
    order.items.forEach(item => {
      const recipe = recipes.find(r => r.id === item.productId);
      if (!recipe) return;

      const currentReq = recipeRequirements.get(recipe.id) || 0;
      recipeRequirements.set(recipe.id, currentReq + item.quantity);
    });
  });

  return Array.from(recipeRequirements.entries()).map(([recipeId, requiredQuantity]) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return null;

    const requiredUnits = unitsFor(requiredQuantity);
    const optimalBatches = batchesFor(requiredQuantity, recipe.batchYield);
    const suggestedBatches = optimalBatches;
    const waste = Math.max(0, (suggestedBatches * recipe.batchYield) - requiredUnits);
    const wastePercentage = requiredUnits > 0 ? (waste / requiredUnits) * 100 : 0;

    return {
      recipe,
      requiredQuantity,
      optimalBatches,
      suggestedBatches,
      waste,
      wastePercentage,
    };
  }).filter(Boolean);
};