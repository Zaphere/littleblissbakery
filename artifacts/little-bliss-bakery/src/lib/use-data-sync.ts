import { useStore } from "@/lib/store";

export function useDataSync() {
  const { store, update } = useStore();

  const exportData = () => {
    const data = {
      ingredients: store.ingredients.map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        supplier: i.supplier,
        packSize: i.packSize,
        unit: i.unit,
        purchasePrice: i.purchasePrice,
        purchaseDate: i.purchaseDate,
        notes: i.notes,
        currentStock: i.currentStock,
        minimumStock: i.minimumStock,
        priceHistory: i.priceHistory,
      })),
      products: store.products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        image: p.image,
        recipeId: p.recipeId,
        batchYield: p.batchYield,
        servingSize: p.servingSize,
        laborCost: p.laborCost,
        energyCost: p.energyCost,
        packagingCost: p.packagingCost,
        wastagePercent: p.wastagePercent,
        retailPriceDozen: p.retailPriceDozen,
        wholesalePriceDozen: p.wholesalePriceDozen,
        active: p.active,
      })),
      recipes: store.recipes.map(r => ({
        id: r.id,
        productId: r.productId,
        ingredients: r.ingredients.map(ri => ({
          ingredientId: ri.ingredientId,
          quantity: ri.quantity,
          unit: ri.unit,
          notes: ri.notes,
        })),
        batchYield: r.batchYield,
        doughWeight: r.doughWeight,
        finishedWeight: r.finishedWeight,
        notes: r.notes,
      })),
      orders: store.orders.map(o => ({
        id: o.id,
        invoiceNumber: o.invoiceNumber,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerAddress: o.customerAddress,
        customerCity: o.customerCity,
        phone: o.phone,
        orderDate: o.orderDate,
        dueDate: o.dueDate,
        salesRep: o.salesRep,
        code: o.code,
        fob: o.fob,
        taxRate: o.taxRate,
        discount: o.discount,
        deliveryFee: o.deliveryFee,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        amountPaid: o.amountPaid,
        items: o.items.map(ii => ({
          productId: ii.productId,
          quantity: ii.quantity,
          unitPrice: ii.unitPrice,
          costSnapshot: ii.costSnapshot,
        })),
        discount: o.discount,
        deliveryFee: o.deliveryFee,
        paymentStatus: o.paymentStatus,
        amountPaid: o.amountPaid,
        notes: o.notes,
        createdAt: o.createdAt,
        archived: o.archived,
      })),
      expenses: store.expenses.map(e => ({
        id: e.id,
        date: e.date,
        category: e.category,
        description: e.description,
        amount: e.amount,
        supplier: e.supplier,
        relatedOrderId: e.relatedOrderId,
        notes: e.notes,
        createdAt: e.createdAt,
      })),
      clients: store.clients.map(c => ({
        id: c.id,
        name: c.name,
        address: c.address,
        city: c.city,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        createdAt: c.createdAt,
      })),
      settings: {
        ...store.settings,
        nextInvoiceNumber: store.settings.nextInvoiceNumber,
      },
      auditLog: store.auditLog.map(a => ({
        id: a.id,
        timestamp: a.timestamp,
        section: a.section,
        action: a.action,
        entityId: a.entityId,
        entityName: a.entityName,
        details: a.details,
        changedBy: a.changedBy,
      })),
      notifications: store.notifications.map(n => ({
        id: n.id,
        timestamp: n.timestamp,
        title: n.title,
        body: n.body,
        section: n.section,
        read: n.read,
        entityId: n.entityId,
      })),
    };
    return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Update ingredients
      if (data.ingredients && data.ingredients.length > 0) {
        const ingredientUpdates = data.ingredients.map((ing: any) => ({
          id: ing.id,
          name: ing.name,
          category: ing.category,
          supplier: ing.supplier,
          packSize: ing.packSize,
          unit: ing.unit,
          purchasePrice: ing.purchasePrice,
          purchaseDate: ing.purchaseDate,
          notes: ing.notes,
          currentStock: ing.currentStock,
          minimumStock: ing.minimumStock,
          priceHistory: ing.priceHistory,
        }));
        update({ ingredients: ingredientUpdates });
      }
      
      // Update products
      if (data.products && data.products.length > 0) {
        const productUpdates = data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          image: p.image,
          recipeId: p.recipeId,
          batchYield: p.batchYield,
          servingSize: p.servingSize,
          laborCost: p.laborCost,
          energyCost: p.energyCost,
          packagingCost: p.packagingCost,
          wastagePercent: p.wastagePercent,
          retailPriceDozen: p.retailPriceDozen,
          wholesalePriceDozen: p.wholesalePriceDozen,
          active: p.active,
        }));
        // Note: products are typically not imported from export (they're set up in seed data)
      }
      
      // Update orders
      if (data.orders && data.orders.length > 0) {
        const orderUpdates = data.orders.map((o: any) => ({
          id: o.id,
          invoiceNumber: o.invoiceNumber,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerAddress: o.customerAddress,
          customerCity: o.customerCity,
          phone: o.phone,
          orderDate: o.orderDate,
          dueDate: o.dueDate,
          salesRep: o.salesRep,
          code: o.code,
          fob: o.fob,
          taxRate: o.taxRate,
          discount: o.discount,
          deliveryFee: o.deliveryFee,
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod,
          amountPaid: o.amountPaid,
          items: o.items.map((ii: any) => ({
            productId: ii.productId,
            quantity: ii.quantity,
            unitPrice: ii.unitPrice,
            costSnapshot: ii.costSnapshot,
          })),
          discount: o.discount,
          deliveryFee: o.deliveryFee,
          paymentStatus: o.paymentStatus,
          amountPaid: o.amountPaid,
          notes: o.notes,
          createdAt: o.createdAt,
          archived: o.archived,
        }));
        update({ orders: orderUpdates });
      }
      
      // Update expenses
      if (data.expenses && data.expenses.length > 0) {
        const expenseUpdates = data.expenses.map((e: any) => ({
          id: e.id,
          date: e.date,
          category: e.category,
          description: e.description,
          amount: e.amount,
          supplier: e.supplier,
          relatedOrderId: e.relatedOrderId,
          notes: e.notes,
          createdAt: e.createdAt,
        }));
        update({ expenses: expenseUpdates });
      }
      
      // Update clients
      if (data.clients && data.clients.length > 0) {
        const clientUpdates = data.clients.map((c: any) => ({
          id: c.id,
          name: c.name,
          address: c.address,
          city: c.city,
          phone: c.phone,
          email: c.email,
          notes: c.notes,
          createdAt: c.createdAt,
        }));
        update({ clients: clientUpdates });
      }
      
      // Update settings
      if (data.settings) {
        update({ settings: { ...store.settings, ...data.settings } });
      }
      
      // Update audit log
      if (data.auditLog && data.auditLog.length > 0) {
        update({ auditLog: data.auditLog });
      }
      
      // Update notifications
      if (data.notifications && data.notifications.length > 0) {
        update({ notifications: data.notifications });
      }
      
      return { success: true, message: "Data imported successfully" };
    } catch (error) {
      console.error("Import error:", error);
      return { success: false, message: "Failed to import data" };
    }
  };

  return { exportData, importData };
}