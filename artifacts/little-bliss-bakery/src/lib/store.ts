export type Ingredient = {
  id: string; name: string; category: string; supplier: string; packSize: number; unit: string;
  purchasePrice: number; purchaseDate: string; notes: string; currentStock: number; minimumStock: number;
  priceHistory: { date: string; price: number }[];
};
export type Product = {
  id: string; name: string; category: string; description: string; image: string; recipeId?: string;
  batchYield: number; servingSize: string; laborCost: number; energyCost: number; packagingCost: number;
  wastagePercent: number; retailPriceDozen: number; wholesalePriceDozen: number; active: boolean;
};
export type RecipeIngredient = { ingredientId: string; quantity: number; unit: string; notes: string };
export type Recipe = { id: string; productId: string; ingredients: RecipeIngredient[]; batchYield: number; doughWeight: number; finishedWeight: number; notes: string };
export type OrderItem = { productId: string; quantity: number; unitPrice: number; costSnapshot: number };
export type Order = {
  id: string; invoiceNumber: string; orderNumber: string; customerName: string; customerAddress: string; customerCity: string; phone: string; orderDate: string; dueDate: string;
  salesRep: string; code: string; fob: string; taxRate: number;
  items: OrderItem[]; discount: number; deliveryFee: number; paymentStatus: string; paymentMethod: string;
  amountPaid: number; payments: { date: string; amount: number }[]; notes: string; createdAt: string; archived?: boolean;
};
export type Expense = { id: string; date: string; category: string; description: string; amount: number; supplier: string; relatedOrderId: string; notes: string };
export type InventoryTransaction = { id: string; ingredientId: string; type: string; quantity: number; date: string; note: string };
export type BudgetAllocation = { id: string; name: string; mode: string; value: number };
export type Client = { id: string; name: string; address: string; city: string; phone: string; email: string; notes: string; createdAt: string };
export type AuditLogEntry = { id: string; timestamp: string; section: string; action: string; entityId: string; entityName: string; details: string; changedBy: string };
export type Notification = { id: string; timestamp: string; title: string; body: string; section: string; read: boolean; entityId?: string };
export type Settings = { bakeryName: string; phone: string; email: string; address: string; currency: string; theme: string; nextInvoiceNumber?: number; hasSeenWelcome?: boolean };
export type Store = { ingredients: Ingredient[]; products: Product[]; recipes: Recipe[]; orders: Order[]; expenses: Expense[]; transactions: InventoryTransaction[]; allocations: BudgetAllocation[]; clients: Client[]; settings: Settings; auditLog: AuditLogEntry[]; notifications: Notification[] };

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

const product = (id: string, name: string, price: number, category: string) => ({ id, name, category, description: '', image: '', batchYield: 12, servingSize: '1 dozen', laborCost: 0, energyCost: 0, packagingCost: 0, wastagePercent: 0, retailPriceDozen: price, wholesalePriceDozen: price - 20, active: true });
const products: Product[] = [
  product('oat-raisin', 'Oat & Raisin Cookies', 180, 'Cookies'),
  product('choc-chip', 'Chocolate Chip Cookies', 180, 'Cookies'),
  product('dark-choc', 'Dark Chocolate Chip Cookies', 180, 'Cookies'),
  product('jam-tarts', 'Strawberry Jam Tarts', 200, 'Tarts'),
  product('oatmeal-pies', 'Oatmeal Pies', 250, 'Pies'),
];
const recipe = (id: string, productId: string, items: [string, number, string][], batchYield: number): Recipe => ({ id, productId, batchYield, doughWeight: 0, finishedWeight: 0, notes: '', ingredients: items.map(([ingredientId, quantity, unit]) => ({ ingredientId, quantity, unit, notes: '' })) });
const recipes: Recipe[] = [
  recipe('recipe-oat', 'oat-raisin', [['margarine', 250, 'g'], ['sugar-caster', 400, 'g'], ['vanilla', 15, 'ml'], ['eggs', 3, 'each'], ['flour', 450, 'g'], ['bicarb', 8, 'g'], ['baking-powder', 5, 'g'], ['salt', 5, 'g'], ['raisins', 250, 'g'], ['oats', 450, 'g']], 30),
  recipe('recipe-choc', 'choc-chip', [['margarine', 250, 'g'], ['sugar-caster', 250, 'g'], ['eggs', 3, 'each'], ['flour', 500, 'g'], ['bicarb', 10, 'g'], ['salt', 10, 'g'], ['chips', 300, 'g']], 30),
  recipe('recipe-jam', 'jam-tarts', [['butter', 85, 'g'], ['sugar-caster', 110, 'g'], ['eggs', 1, 'each'], ['flour', 150, 'g'], ['cornflour', 90, 'g'], ['baking-powder', 5, 'g'], ['jam', 400, 'g'], ['icing', 20, 'g'], ['cooking-oil', 5, 'ml']], 15),
  recipe('recipe-dark', 'dark-choc', [['margarine', 250, 'g'], ['sugar-caster', 200, 'g'], ['eggs', 3, 'each'], ['flour', 450, 'g'], ['bicarb', 10, 'g'], ['salt', 8, 'g'], ['chips', 350, 'g'], ['cinnamon', 3, 'g']], 30),
  recipe('recipe-oatmeal', 'oatmeal-pies', [['butter', 200, 'g'], ['sugar-caster', 300, 'g'], ['eggs', 2, 'each'], ['vanilla', 10, 'ml'], ['oats', 500, 'g'], ['flour', 200, 'g'], ['baking-powder', 8, 'g'], ['salt', 3, 'g'], ['cooking-oil', 5, 'ml']], 24),
];
const orders: Order[] = [];
const clients: Client[] = [];
const initialStore: Store = {
  ingredients, products, recipes, orders,
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
    const parsed = JSON.parse(raw) as Partial<Store>;
    const normalizedOrders = (parsed.orders || []).map((order, index) => normalizeOrder(order, index));
    const maxExisting = Math.max(0, ...normalizedOrders.map(order => invoiceSequence(order.invoiceNumber)));
    return {
      ...initialStore,
      ...parsed,
      orders: normalizedOrders,
      clients: parsed.clients || [],
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
export const ingredientUsageForOrder = (order: Order, recipes: Recipe[], products: Product[], ingredients: Ingredient[]): Record<string, number> => {
  const usage: Record<string, number> = {};
  order.items.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    const recipe = recipes.find(r => r.productId === item.productId);
    if (!product || !recipe) return;
    const batches = item.quantity / product.batchYield;
    recipe.ingredients.forEach(row => {
      usage[row.ingredientId] = (usage[row.ingredientId] || 0) + row.quantity * batches;
    });
  });
  return usage;
};
export const ingredientUsageForOrders = (orders: Order[], recipes: Recipe[], products: Product[]): Record<string, number> => {
  const totalUsage: Record<string, number> = {};
  orders.forEach(order => {
    const usage = ingredientUsageForOrder(order, recipes, products);
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
export const doughLeftover = (orders: Order[], recipes: Recipe[], products: Product[]): { product: Product; doughMade: number; doughUsed: number; leftover: number }[] => {
  const usage: Record<string, { made: number; used: number }> = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const recipe = recipes.find(r => r.productId === item.productId);
      if (!product || !recipe) return;
      if (!usage[item.productId]) usage[item.productId] = { made: 0, used: 0 };
      const batches = item.quantity / product.batchYield;
      usage[item.productId].made += recipe.doughWeight * batches;
      usage[item.productId].used += item.quantity;
    });
  });
  return products.filter(p => usage[p.id]).map(p => ({
    product: p,
    doughMade: usage[p.id].made,
    doughUsed: usage[p.id].used,
    leftover: usage[p.id].made - usage[p.id].used,
  }));
};
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