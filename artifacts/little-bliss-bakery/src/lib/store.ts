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
  id: string; orderNumber: string; customerName: string; phone: string; orderDate: string; dueDate: string;
  items: OrderItem[]; discount: number; deliveryFee: number; paymentStatus: string; paymentMethod: string;
  amountPaid: number; payments: { date: string; amount: number }[]; notes: string; createdAt: string;
};
export type Expense = { id: string; date: string; category: string; description: string; amount: number; supplier: string; relatedOrderId: string; notes: string };
export type InventoryTransaction = { id: string; ingredientId: string; type: string; quantity: number; date: string; note: string };
export type BudgetAllocation = { id: string; name: string; mode: string; value: number };
export type Settings = { bakeryName: string; phone: string; email: string; address: string; currency: string; theme: string };
export type Store = { ingredients: Ingredient[]; products: Product[]; recipes: Recipe[]; orders: Order[]; expenses: Expense[]; transactions: InventoryTransaction[]; allocations: BudgetAllocation[]; settings: Settings };

const d = new Date().toISOString().slice(0, 10);
const ingredients: Ingredient[] = [
  ['flour', "Baker's Pride Flour", 'Dry goods', 'Baker’s Pride', 10000, 'g', 157, 1800, 1200],
  ['margarine', 'Sunshine Original Margarine', 'Fats', 'Sunshine', 500, 'g', 21, 850, 500],
  ['sugar', 'Caster Sugar', 'Dry goods', 'Shoprite', 500, 'g', 34.99, 900, 400],
  ['icing', 'Icing Sugar', 'Dry goods', 'Shoprite', 500, 'g', 34.99, 500, 250],
  ['baking-powder', 'Royal Baking Powder', 'Raising agents', 'Royal', 200, 'g', 38, 220, 100],
  ['bicarb', 'Bicarbonate of Soda', 'Raising agents', 'Shoprite', 200, 'g', 38, 180, 80],
  ['raisins', 'Safari Raisins', 'Fruit', 'Safari', 1000, 'g', 95, 500, 250],
  ['chips', 'Chocolate Chips', 'Chocolate', 'Callebaut', 1000, 'g', 100, 300, 200],
  ['jam', 'AG Jam', 'Preserves', 'AG Foods', 900, 'g', 100, 450, 180],
  ...['Butter', 'Eggs', 'Vanilla Essence', 'Oats', 'Salt', 'Cinnamon', 'Nutmeg', 'Cornflour', 'Cooking Oil / Cooking Spray'].map((name, i) => ({
    id: `missing-${i}`, name, category: 'To price', supplier: '', packSize: 0, unit: name === 'Eggs' ? 'each' : 'g',
    purchasePrice: 0, purchaseDate: d, notes: 'Add pack size and purchase price', currentStock: 0, minimumStock: 0, priceHistory: [],
  })),
].map((item: any) => Array.isArray(item) ? ({ id: item[0], name: item[1], category: item[2], supplier: item[3], packSize: item[4], unit: item[5], purchasePrice: item[6], purchaseDate: d, notes: '', currentStock: item[7], minimumStock: item[8], priceHistory: [{ date: d, price: item[6] }] }) : item);

const product = (id: string, name: string, price: number, category: string) => ({ id, name, category, description: '', image: '', batchYield: 12, servingSize: '1 dozen', laborCost: 0, energyCost: 0, packagingCost: 0, wastagePercent: 0, retailPriceDozen: price, wholesalePriceDozen: price - 20, active: true });
const products: Product[] = [
  product('oat-raisin', 'Oat & Raisin Cookies', 180, 'Cookies'),
  product('choc-chip', 'Chocolate Chip Cookies', 180, 'Cookies'),
  product('dark-choc', 'Dark Chocolate Chip Cookies', 180, 'Cookies'),
  product('jam-tarts', 'Jam Tarts', 200, 'Tarts'),
  product('oatmeal-pies', 'Oatmeal Pies', 250, 'Pies'),
];
const recipe = (id: string, productId: string, items: [string, number, string][], batchYield: number): Recipe => ({ id, productId, batchYield, doughWeight: 0, finishedWeight: 0, notes: '', ingredients: items.map(([ingredientId, quantity, unit]) => ({ ingredientId, quantity, unit, notes: '' })) });
const recipes: Recipe[] = [
  recipe('recipe-oat', 'oat-raisin', [['margarine', 250, 'g'], ['sugar', 400, 'g'], ['missing-2', 15, 'ml'], ['missing-1', 3, 'each'], ['flour', 450, 'g'], ['bicarb', 8, 'g'], ['baking-powder', 5, 'g'], ['missing-4', 5, 'g'], ['raisins', 250, 'g'], ['missing-3', 450, 'g']], 30),
  recipe('recipe-choc', 'choc-chip', [['margarine', 250, 'g'], ['sugar', 250, 'g'], ['missing-1', 3, 'each'], ['flour', 500, 'g'], ['bicarb', 10, 'g'], ['missing-4', 10, 'g'], ['chips', 300, 'g']], 30),
  recipe('recipe-jam', 'jam-tarts', [['missing-0', 85, 'g'], ['sugar', 110, 'g'], ['missing-1', 1, 'each'], ['flour', 150, 'g'], ['missing-7', 90, 'g'], ['baking-powder', 5, 'g'], ['jam', 400, 'g'], ['icing', 20, 'g'], ['missing-8', 5, 'ml']], 15),
];
const orders: Order[] = [
  { id: 'ord-1', orderNumber: 'LB-1042', customerName: 'Mandla Dlamini', phone: '7612 4088', orderDate: d, dueDate: d, items: [{ productId: 'oat-raisin', quantity: 3, unitPrice: 180, costSnapshot: 62 }], discount: 0, deliveryFee: 0, paymentStatus: 'Paid', paymentMethod: 'Mobile money', amountPaid: 540, payments: [{ date: d, amount: 540 }], notes: 'Office tea table', createdAt: new Date().toISOString() },
  { id: 'ord-2', orderNumber: 'LB-1041', customerName: 'Thandiwe Maseko', phone: '7644 2290', orderDate: d, dueDate: d, items: [{ productId: 'jam-tarts', quantity: 2, unitPrice: 200, costSnapshot: 118 }], discount: 0, deliveryFee: 30, paymentStatus: 'Part paid', paymentMethod: 'Cash', amountPaid: 200, payments: [{ date: d, amount: 200 }], notes: 'Birthday tea', createdAt: new Date(Date.now() - 86400000).toISOString() },
];
const initialStore: Store = {
  ingredients, products, recipes, orders,
  expenses: [{ id: 'exp-1', date: d, category: 'Ingredients', description: 'Weekly dry goods top-up', amount: 430, supplier: 'Shoprite Mbabane', relatedOrderId: '', notes: '' }],
  transactions: [], allocations: [{ id: 'alloc-1', name: 'Ingredients', mode: 'percent', value: 35 }, { id: 'alloc-2', name: 'Owner draw', mode: 'percent', value: 20 }, { id: 'alloc-3', name: 'Operating buffer', mode: 'fixed', value: 500 }],
  settings: { bakeryName: 'Little Bliss Bakery', phone: '+268 7600 1184', email: 'hello@littlebliss.sz', address: 'Mbabane, Eswatini', currency: 'E', theme: 'light' },
};
const KEY = 'little-bliss-store-v1';
export const loadStore = (): Store => { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : initialStore; } catch { return initialStore; } };
export const saveStore = (store: Store) => localStorage.setItem(KEY, JSON.stringify(store));
export const resetStore = () => localStorage.removeItem(KEY);
export const unitCost = (i: Ingredient) => i.packSize > 0 && i.purchasePrice > 0 ? i.purchasePrice / i.packSize : null;
export const costOfRecipe = (r: Recipe, all: Ingredient[]) => r.ingredients.reduce((sum, row) => { const ing = all.find(i => i.id === row.ingredientId); const cost = ing ? unitCost(ing) : null; return sum + (cost === null ? 0 : cost * row.quantity); }, 0);
export const today = () => new Date().toISOString().slice(0, 10);