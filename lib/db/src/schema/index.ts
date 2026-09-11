import { pgTable, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const customersTable = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  notes: text("notes"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  orderNumber: text("order_number"),
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address"),
  customerCity: text("customer_city"),
  phone: text("phone"),
  orderDate: text("order_date"),
  dueDate: text("due_date"),
  salesRep: text("sales_rep"),
  taxRate: numeric("tax_rate"),
  discount: numeric("discount"),
  deliveryFee: numeric("delivery_fee"),
  paymentStatus: text("payment_status"),
  paymentMethod: text("payment_method"),
  amountPaid: numeric("amount_paid"),
  notes: text("notes"),
  archived: integer("archived").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  productId: text("product_id").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  costSnapshot: numeric("cost_snapshot"),
});

export const ingredientsTable = pgTable("ingredients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  supplier: text("supplier"),
  packSize: numeric("pack_size"),
  unit: text("unit"),
  purchasePrice: numeric("purchase_price"),
  purchaseDate: text("purchase_date"),
  notes: text("notes"),
  currentStock: numeric("current_stock"),
  minimumStock: numeric("minimum_stock"),
  priceHistory: text("price_history"),
});

export const stockHistoryTable = pgTable("stock_history", {
  id: text("id").primaryKey(),
  ingredientId: text("ingredient_id").notNull(),
  type: text("type").notNull(),
  quantity: numeric("quantity").notNull(),
  date: text("date"),
  note: text("note"),
});

export const expensesTable = pgTable("expenses", {
  id: text("id").primaryKey(),
  date: text("date"),
  category: text("category"),
  description: text("description"),
  amount: numeric("amount"),
  supplier: text("supplier"),
  relatedOrderId: text("related_order_id"),
  notes: text("notes"),
});

export const apiKeysTable = pgTable("api_keys", {
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});
