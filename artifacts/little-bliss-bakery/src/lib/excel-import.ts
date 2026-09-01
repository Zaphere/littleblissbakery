import * as XLSX from 'xlsx';
import type { Product, Order, OrderItem, Expense, Client } from './store';

export type ParsedInvoice = {
  invoiceNumber: string;
  customerName: string;
  customerAddress: string;
  customerCity: string;
  customerPhone: string;
  orderDate: string;
  orderNumber: string;
  paymentMethod: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subTotal: number;
  total: number;
  isExpense: boolean;
};

export type ImportResult = {
  products: Product[];
  orders: Order[];
  expenses: Expense[];
  clients: Client[];
  invoiceNumbers: string[];
  warnings: string[];
};

const PRODUCT_ALIASES: Record<string, string> = {
  'choc-chip cookies': 'Chocolate Chip Cookies',
  'choc chip cookies': 'Chocolate Chip Cookies',
  'choc-chip cookies: doz': 'Chocolate Chip Cookies',
  'choc-chip cookies: dz': 'Chocolate Chip Cookies',
  'chocolate chip cookies': 'Chocolate Chip Cookies',
  'oatmeal cookies': 'Oatmeal Cookies',
  'oatmeal cokies': 'Oatmeal Cookies',
  'oatmeal cookies: doz': 'Oatmeal Cookies',
  'oatmeal cookies: dz': 'Oatmeal Cookies',
  'oat & raisin cookies': 'Oat & Raisin Cookies',
  'oat and raisin cookies': 'Oat & Raisin Cookies',
  'dark chocolate chip cookies': 'Dark Chocolate Chip Cookies',
  'jam tarts': 'Strawberry Jam Tarts',
  'jam tart': 'Strawberry Jam Tarts',
  'oatmeal pies': 'Oatmeal Pies',
  'oatmeal pie': 'Oatmeal Pies',
  'outmeal pies': 'Oatmeal Pies',
  'oatmeal cakes': 'Oatmeal Cakes',
  'oatmeal cake': 'Oatmeal Cakes',
  'pastei da nata': 'Pastei Da Nata',
  'pastel de nata': 'Pastel De Nata',
};

const EXPENSE_KEYWORDS = ['travel', 'transport', 'delivery', 'fuel', 'petrol', 'taxi', 'fare'];

function normalizeProductName(raw: string): { name: string; isExpense: boolean } {
  const lower = raw.toLowerCase().trim();
  // Check if it's an expense item
  if (EXPENSE_KEYWORDS.some(kw => lower.includes(kw))) {
    return { name: raw.trim(), isExpense: true };
  }
  // Try exact match first
  if (PRODUCT_ALIASES[lower]) {
    return { name: PRODUCT_ALIASES[lower], isExpense: false };
  }
  // Try partial match
  for (const [key, normalized] of Object.entries(PRODUCT_ALIASES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return { name: normalized, isExpense: false };
    }
  }
  // Default: capitalize first letter of each word
  return {
    name: raw.trim().replace(/\b\w/g, c => c.toUpperCase()),
    isExpense: false,
  };
}

function detectPaymentMethod(rows: any[][]): string {
  // All rows 0-3 have payment labels (Cash/Check/Credit/Other) in col 0
  // The actual selected method isn't visible in raw data, default to Cash
  return 'Cash';
}

function formatDate(dateVal: any): string {
  if (!dateVal) return new Date().toISOString().slice(0, 10);
  if (dateVal instanceof Date) {
    return dateVal.toISOString().slice(0, 10);
  }
  if (typeof dateVal === 'string') {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function parseInvoiceSheet(rows: any[][], sheetName: string): ParsedInvoice | null {
  if (rows.length < 20) return null;

  // Invoice number: Row 1, Col 12 (0-indexed)
  const invoiceNumber = String(rows[1]?.[12] || '').trim();
  if (!invoiceNumber) return null;

  // Customer info: Rows 11-14, Col 3 (0-indexed)
  const customerName = String(rows[11]?.[3] || '').trim();
  const customerAddress = String(rows[12]?.[3] || '').trim();
  const customerCity = String(rows[13]?.[3] || '').trim();
  const customerPhone = String(rows[14]?.[3] || '').trim();

  // Date: Row 11, Col 12 (0-indexed)
  const orderDate = formatDate(rows[11]?.[12]);

  // Order number: Row 12, Col 11 (0-indexed)
  const orderNumber = String(rows[12]?.[11] || '').trim();

  // Payment method: detect from rows 0-3
  const paymentMethod = detectPaymentMethod(rows);

  // Line items: Rows 17-45, Cols 2-12 (0-indexed)
  const items: ParsedInvoice['items'] = [];
  for (let i = 17; i <= Math.min(45, rows.length - 1); i++) {
    const qty = rows[i]?.[2];
    const desc = rows[i]?.[3];
    const unitPrice = rows[i]?.[11];
    const total = rows[i]?.[12];

    if (qty && desc && unitPrice) {
      const quantity = Number(qty);
      const price = Number(unitPrice);
      const tot = total ? Number(total) : quantity * price;
      if (!isNaN(quantity) && quantity > 0 && !isNaN(price)) {
        items.push({
          description: String(desc).trim(),
          quantity,
          unitPrice: price,
          total: tot,
        });
      }
    }
  }

  if (items.length === 0) return null;

  // SubTotal/Total: look for 'SubTotal' or 'TOTAL' label in col 11, value in col 12
  let subTotal = 0;
  let total = 0;
  for (let i = 44; i <= Math.min(55, rows.length - 1); i++) {
    const label = String(rows[i]?.[11] || '').trim().toLowerCase();
    const val = rows[i]?.[12];
    if (label.includes('subtotal') || label.includes('sub total')) {
      subTotal = Number(val) || 0;
    }
    if (label.includes('total') && !label.includes('sub')) {
      total = Number(val) || 0;
    }
  }

  // If no subtotal found, use sum of items
  if (!subTotal) subTotal = items.reduce((s, item) => s + item.total, 0);
  if (!total) total = subTotal;

  // Check if all items are expenses
  const allExpenses = items.every(item => {
    const { isExpense } = normalizeProductName(item.description);
    return isExpense;
  });

  return {
    invoiceNumber,
    customerName,
    customerAddress,
    customerCity,
    customerPhone,
    orderDate,
    orderNumber,
    paymentMethod,
    items,
    subTotal,
    total,
    isExpense: allExpenses,
  };
}

export function parseExcelFile(file: File): Promise<ParsedInvoice[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const invoices: ParsedInvoice[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          const invoice = parseInvoiceSheet(rows, sheetName);
          if (invoice) {
            invoices.push(invoice);
          }
        }

        // Sort by invoice number
        invoices.sort((a, b) => {
          const numA = parseInt(a.invoiceNumber.replace(/\D/g, ''), 10);
          const numB = parseInt(b.invoiceNumber.replace(/\D/g, ''), 10);
          return numA - numB;
        });

        resolve(invoices);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function buildImportData(
  invoices: ParsedInvoice[],
  existingProducts: Product[],
  existingOrders: Order[]
): ImportResult {
  const warnings: string[] = [];
  const productMap = new Map<string, Product>();
  const clientMap = new Map<string, Client>();
  const orders: Order[] = [];
  const expenses: Expense[] = [];

  // Index existing products by normalized name
  for (const p of existingProducts) {
    productMap.set(p.name.toLowerCase(), p);
  }

  // Track existing invoice numbers to avoid duplicates
  const existingInvoiceNums = new Set(existingOrders.map(o => o.invoiceNumber));

  let invoiceCounter = 0;

  for (const inv of invoices) {
    // Skip if invoice already exists
    if (existingInvoiceNums.has(inv.invoiceNumber)) {
      warnings.push(`Invoice ${inv.invoiceNumber} already exists, skipping`);
      continue;
    }

    invoiceCounter++;

    // Process items
    const orderItems: OrderItem[] = [];
    const expenseItems: { description: string; amount: number }[] = [];

    for (const item of inv.items) {
      const { name: productName, isExpense } = normalizeProductName(item.description);

      if (isExpense) {
        expenseItems.push({ description: item.description, amount: item.total });
        continue;
      }

      // Find or create product
      let product = productMap.get(productName.toLowerCase());
      if (!product) {
        // Determine category from name
        let category = 'Other';
        const lowerName = productName.toLowerCase();
        if (lowerName.includes('cookie')) category = 'Cookies';
        else if (lowerName.includes('tart')) category = 'Tarts';
        else if (lowerName.includes('pie')) category = 'Pies';
        else if (lowerName.includes('cake')) category = 'Cakes';
        else if (lowerName.includes('nata')) category = 'Pastries';

        product = {
          id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: productName,
          category,
          description: '',
          image: '',
          batchYield: 12,
          servingSize: '1 dozen',
          laborCost: 0,
          energyCost: 0,
          packagingCost: 0,
          wastagePercent: 0,
          retailPriceDozen: item.unitPrice,
          wholesalePriceDozen: item.unitPrice - 20,
          active: true,
        };
        productMap.set(productName.toLowerCase(), product);
        warnings.push(`Created new product: ${productName}`);
      }

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costSnapshot: 0,
      });
    }

    // Create client
    if (inv.customerName && !clientMap.has(inv.customerName.toLowerCase())) {
      clientMap.set(inv.customerName.toLowerCase(), {
        id: `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: inv.customerName,
        address: inv.customerAddress,
        city: inv.customerCity,
        phone: inv.customerPhone,
        email: '',
        notes: '',
        createdAt: new Date().toISOString(),
      });
    }

    // Create order (if it has product items)
    if (orderItems.length > 0) {
      const total = orderItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      orders.push({
        id: `order-${Date.now()}-${invoiceCounter}`,
        invoiceNumber: inv.invoiceNumber,
        orderNumber: inv.orderNumber,
        customerName: inv.customerName,
        customerAddress: inv.customerAddress,
        customerCity: inv.customerCity,
        phone: inv.customerPhone,
        orderDate: inv.orderDate,
        dueDate: inv.orderDate,
        salesRep: '',
        code: '',
        fob: '',
        taxRate: 0,
        items: orderItems,
        discount: 0,
        deliveryFee: 0,
        paymentStatus: 'Paid',
        paymentMethod: inv.paymentMethod,
        amountPaid: orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) + 0 - 0 + inv.deliveryFee,
        payments: [{ date: inv.orderDate, amount: orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) + inv.deliveryFee }],
        notes: '',
        createdAt: new Date().toISOString(),
      });
    }

    // Create expenses for expense items
    for (const exp of expenseItems) {
      expenses.push({
        id: `exp-${Date.now()}-${invoiceCounter}-${Math.random().toString(36).slice(2, 4)}`,
        date: inv.orderDate,
        category: 'Transport',
        description: `${exp.description} (${inv.invoiceNumber})`,
        amount: exp.amount,
        supplier: '',
        relatedOrderId: '',
        notes: `Imported from ${inv.invoiceNumber}`,
      });
    }
  }

  // Determine next invoice number
  const allInvoiceNums = [...existingInvoiceNums, ...orders.map(o => o.invoiceNumber)];
  const maxNum = allInvoiceNums.reduce((max, num) => {
    const n = parseInt(num.replace(/\D/g, ''), 10);
    return n > max ? n : max;
  }, 0);

  return {
    products: Array.from(productMap.values()),
    orders,
    expenses,
    clients: Array.from(clientMap.values()),
    invoiceNumbers: allInvoiceNums,
    warnings,
  };
}
