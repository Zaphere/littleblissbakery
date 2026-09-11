import type { Store } from "@/lib/store";

export function exportData(store: Store) {
  const data = {
    ingredients: store.ingredients,
    recipes: store.recipes,
    orders: store.orders,
    expenses: store.expenses,
    clients: store.clients,
    settings: store.settings,
    auditLog: store.auditLog,
    notifications: store.notifications,
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
}

export function importData(text: string, store: Store, update: (patch: Partial<Store>) => void) {
  try {
    const data = JSON.parse(text);

    if (data.ingredients && data.ingredients.length > 0) {
      update({ ingredients: data.ingredients });
    }
    if (data.recipes && data.recipes.length > 0) {
      update({ recipes: data.recipes });
    }
    if (data.orders && data.orders.length > 0) {
      update({ orders: data.orders });
    }
    if (data.expenses && data.expenses.length > 0) {
      update({ expenses: data.expenses });
    }
    if (data.clients && data.clients.length > 0) {
      update({ clients: data.clients });
    }
    if (data.settings) {
      update({ settings: { ...store.settings, ...data.settings } });
    }
    if (data.auditLog && data.auditLog.length > 0) {
      update({ auditLog: data.auditLog });
    }
    if (data.notifications && data.notifications.length > 0) {
      update({ notifications: data.notifications });
    }

    return { success: true, message: "Data imported successfully" };
  } catch (error) {
    console.error("Import error:", error);
    return { success: false, message: "Failed to import data" };
  }
}
