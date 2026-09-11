export type Ingredient = {
  id: string; name: string; category: string; supplier: string; packSize: number; unit: string;
  purchasePrice: number; purchaseDate: string; notes: string; currentStock: number; minimumStock: number;
  priceHistory: { date: string; price: number }[];
};

export const INGREDIENT_CATEGORIES = [
  'Dry goods', 'Fats', 'Dairy', 'Fruit', 'Chocolate',
  'Raising agents', 'Spices', 'Flavourings', 'Preserves',
] as const;
export type RecipeIngredient = { ingredientId: string; quantity: number; unit: string; notes: string };
export type Recipe = {
  id: string; name: string; category: string; description: string; image: string;
  batchYield: number; servingSize: string; laborCost: number; energyCost: number; packagingCost: number;
  wastagePercent: number; retailPriceDozen: number; wholesalePriceDozen: number; active: boolean;
  ovenTemp: string; bakeTimeMinutes: number;
  ingredients: RecipeIngredient[]; doughWeight: number; finishedWeight: number; notes: string;
};
export type OrderItem = { productId: string; quantity: number; unitPrice: number; costSnapshot: number };
export type Order = {
  id: string; invoiceNumber: string; orderNumber: string; customerName: string; customerAddress: string; customerCity: string; phone: string; orderDate: string; dueDate: string;
  salesRep: string; code: string; fob: string; taxRate: number;
  items: OrderItem[]; discount: number; deliveryFee: number; paymentStatus: string; paymentMethod: string;
  amountPaid: number; payments: { date: string; amount: number }[]; notes: string; createdAt: string; archived?: boolean;
};
export type Expense = { id: string; date: string; category: string; description: string; amount: number; supplier: string; relatedOrderId: string; notes: string };
export type InventoryTransaction = { id: string; ingredientId: string; type: string; quantity: number; date: string; note: string; minimumStock?: number };
export type BudgetAllocation = { id: string; name: string; mode: string; value: number };
export type Client = { id: string; name: string; address: string; city: string; phone: string; email: string; notes: string; createdAt: string; status?: string };
export type AuditLogEntry = { id: string; timestamp: string; section: string; action: string; entityId: string; entityName: string; details: string; changedBy: string };
export type Notification = { id: string; timestamp: string; title: string; body: string; section: string; read: boolean; entityId?: string };
export type Settings = { bakeryName: string; phone: string; email: string; address: string; currency: string; theme: string; nextInvoiceNumber?: number; hasSeenWelcome?: boolean };
export type Store = { ingredients: Ingredient[]; recipes: Recipe[]; orders: Order[]; expenses: Expense[]; transactions: InventoryTransaction[]; allocations: BudgetAllocation[]; clients: Client[]; settings: Settings; auditLog: AuditLogEntry[]; notifications: Notification[] };

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
  ['butter', 'Butter', 'Fats', '', 500, 'g', 21, d, '', 0, 200],
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
  recipe('jam-tarts', 'Strawberry Jam Tarts', 200, 'Tarts', [['butter', 85, 'g'], ['sugar-caster', 110, 'g'], ['eggs', 1, 'each'], ['flour', 150, 'g'], ['cornflour', 90, 'g'], ['baking-powder', 5, 'g'], ['jam', 400, 'g'], ['icing', 20, 'g'], ['cooking-oil', 5, 'ml']], 15),
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
const initialStore: Store = {
  ingredients, recipes, orders,
  expenses: [],
  transactions: [], allocations: [{ id: 'alloc-1', name: 'Ingredients', mode: 'percent', value: 35 }, { id: 'alloc-2', name: 'Owner draw', mode: 'percent', value: 20 }, { id: 'alloc-3', name: 'Operating buffer', mode: 'fixed', value: 500 }],
  clients,
  settings: { bakeryName: 'Little Bliss Bakery', phone: '+268 621 0474', email: 'morrelloblue@gmail.com', address: 'P.O. Box 2700, Matsapha, Eswatini', currency: 'E', theme: 'light', nextInvoiceNumber: 37, hasSeenWelcome: false },
  auditLog: [],
  notifications: [],
};
const KEY = 'little-bliss-store-v1';
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
});
export const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialStore;
    const parsed = JSON.parse(raw) as Partial<Store> & { products?: { id: string; name: string; category: string; description: string; image: string; batchYield: number; servingSize: string; laborCost: number; energyCost: number; packagingCost: number; wastagePercent: number; retailPriceDozen: number; wholesalePriceDozen: number; active: boolean; ovenTemp: string; bakeTimeMinutes: number }[]; recipes?: any[] };
    const normalizedOrders = (parsed.orders || []).map((order, index) => normalizeOrder(order, index));
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
    recipes = recipes.filter((r: any) => !removedRecipeIds.includes(r.id));
    const batchYieldOverrides: Record<string, number> = { 'oat-raisin': 25, 'choc-chip': 25 };
    recipes = recipes.map((r: any) => batchYieldOverrides[r.id] !== undefined ? { ...r, batchYield: batchYieldOverrides[r.id] } : r);
    return {
      ...initialStore,
      ...parsed,
      recipes,
      orders: normalizedOrders,
      clients: (() => { const savedClients = parsed.clients || []; const savedIds = new Set(savedClients.map((c: any) => c.id)); const newDefaults = initialStore.clients.filter(c => !savedIds.has(c.id)); return [...newDefaults, ...savedClients]; })(),
      settings: { ...initialStore.settings, ...(parsed.settings || {}), nextInvoiceNumber: Math.max(Number(parsed.settings?.nextInvoiceNumber || 0), maxExisting + 1, 37) },
      auditLog: parsed.auditLog || [],
      notifications: parsed.notifications || [],
    };
  } catch { return initialStore; }
};
export const saveStore = (store: Store) => localStorage.setItem(KEY, JSON.stringify(store));
export const resetStore = () => localStorage.removeItem(KEY);
export const unitCost = (i: Ingredient) => i.packSize > 0 && i.purchasePrice > 0 ? i.purchasePrice / i.packSize : null;
export const costOfRecipe = (r: Recipe, all: Ingredient[]) => r.ingredients.reduce((sum, row) => { const ing = all.find(i => i.id === row.ingredientId); const cost = ing ? unitCost(ing) : null; return sum + (cost === null ? 0 : cost * row.quantity); }, 0);
export const ingredientUsageForOrder = (order: Order, recipes: Recipe[]): Record<string, number> => {
  const usage: Record<string, number> = {};
  order.items.forEach(item => {
    const recipe = recipes.find(r => r.id === item.productId);
    if (!recipe) return;
    const batches = Math.ceil(item.quantity / recipe.batchYield);
    recipe.ingredients.forEach(row => {
      usage[row.ingredientId] = (usage[row.ingredientId] || 0) + row.quantity * batches;
    });
  });
  return usage;
};
export const ingredientUsageForOrders = (orders: Order[], recipes: Recipe[]): Record<string, number> => {
  const totalUsage: Record<string, number> = {};
  orders.forEach(order => {
    const usage = ingredientUsageForOrder(order, recipes);
    Object.entries(usage).forEach(([id, qty]) => {
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
export const doughLeftover = (orders: Order[], recipes: Recipe[]): { recipe: Recipe; doughMade: number; doughUsed: number; leftover: number }[] => {
  const usage: Record<string, { made: number; used: number }> = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const recipe = recipes.find(r => r.id === item.productId);
      if (!recipe) return;
      if (!usage[item.productId]) usage[item.productId] = { made: 0, used: 0 };
      const batches = Math.ceil(item.quantity / recipe.batchYield);
      usage[item.productId].made += recipe.doughWeight * batches;
      usage[item.productId].used += item.quantity;
    });
  });
  return recipes.filter(r => usage[r.id]).map(r => ({
    recipe: r,
    doughMade: usage[r.id].made,
    doughUsed: usage[r.id].used,
    leftover: usage[r.id].made - usage[r.id].used,
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

export const calculateOrderOutstanding = (items: OrderItem[], discount: number, deliveryFee: number, taxRate: number, amountPaid: number): number =>
  Math.max(0, roundCurrency(calculateOrderTotal(items, discount, deliveryFee, taxRate) - amountPaid));

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