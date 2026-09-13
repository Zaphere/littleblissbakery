import { costOfRecipe, ingredientUsageForOrder, type Order, type Store } from '@/lib/store';

type KitchenOrderDocumentProps = {
  order: Order;
  store: Store;
};

const rd = (v: string) =>
  new Date(`${v}T00:00:00`).toLocaleDateString('en-SZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export function KitchenOrderDocument({ order, store }: KitchenOrderDocumentProps) {
  const usage = ingredientUsageForOrder(order, store.recipes);

  const perProduct = order.items.map(item => {
    const recipe = store.recipes.find(r => r.id === item.productId);
    const batches = recipe ? Math.ceil(item.quantity / recipe.batchYield) : 0;
    const ingredients = recipe ? recipe.ingredients.map(row => {
      const ing = store.ingredients.find(i => i.id === row.ingredientId);
      const usedQty = row.quantity * batches;
      return {
        name: ing?.name || 'Unknown',
        unit: row.unit,
        requiredQty: usedQty,
      };
    }) : [];
    return {
      recipe,
      quantity: item.quantity,
      batches,
      ovenTemp: recipe?.ovenTemp || '170–180°C',
      bakeTime: recipe?.bakeTimeMinutes || 14,
      ingredients,
    };
  });

  const totalBatches = perProduct.reduce((s, p) => s + p.batches, 0);
  const totalUnits = perProduct.reduce((s, p) => s + p.quantity, 0);

  return (
    <article className="printable-kitchen kitchen-paper" aria-label={`Kitchen order for ${order.invoiceNumber}`}>
      {/* Header */}
      <header className="kitchen-header">
        <div className="kitchen-logo">
          <img src="/little-bliss-logo.jpg" alt="Little Bliss Bakery" className="h-12 w-auto object-contain" />
        </div>
        <div className="kitchen-title-block">
          <h1 className="kitchen-title">Kitchen Order</h1>
          <p className="kitchen-subtitle">Little Bliss Bakery</p>
        </div>
        <div className="kitchen-meta">
          <div className="kitchen-meta-row">
            <span>Invoice</span>
            <strong>{order.invoiceNumber}</strong>
          </div>
          <div className="kitchen-meta-row">
            <span>Date</span>
            <strong>{rd(order.orderDate)}</strong>
          </div>
          <div className="kitchen-meta-row">
            <span>Due</span>
            <strong>{rd(order.dueDate)}</strong>
          </div>
        </div>
      </header>

      {/* Customer Info */}
      <section className="kitchen-customer">
        <div className="kitchen-customer-row">
          <span className="kitchen-label">Customer</span>
          <strong>{order.customerName || '—'}</strong>
        </div>
        {order.phone && (
          <div className="kitchen-customer-row">
            <span className="kitchen-label">Phone</span>
            <strong>{order.phone}</strong>
          </div>
        )}
        {order.notes && (
          <div className="kitchen-customer-row">
            <span className="kitchen-label">Notes</span>
            <strong>{order.notes}</strong>
          </div>
        )}
      </section>

      {/* Summary Bar */}
      <section className="kitchen-summary">
        <div className="kitchen-summary-item">
          <span className="kitchen-summary-value">{totalUnits}</span>
          <span className="kitchen-summary-label">Total Units</span>
        </div>
        <div className="kitchen-summary-item">
          <span className="kitchen-summary-value">{totalBatches}</span>
          <span className="kitchen-summary-label">Total Batches</span>
        </div>
        <div className="kitchen-summary-item">
          <span className="kitchen-summary-value">{perProduct.length}</span>
          <span className="kitchen-summary-label">Products</span>
        </div>
      </section>

      {/* Product Cards */}
      <section className="kitchen-products">
        {perProduct.map((pp, idx) => (
          <div key={idx} className="kitchen-product-card">
            <div className="kitchen-product-header">
              <div className="kitchen-product-name">
                <span className="kitchen-product-number">#{idx + 1}</span>
                <strong>{pp.recipe?.name || 'Unknown'}</strong>
              </div>
              <div className="kitchen-product-meta">
                <span className="kitchen-badge">{pp.quantity} units</span>
                <span className="kitchen-badge kitchen-badge-batches">{pp.batches} batch{pp.batches !== 1 ? 'es' : ''}</span>
              </div>
            </div>

            {/* Baking Details */}
            <div className="kitchen-baking-details">
              <div className="kitchen-baking-item">
                <div>
                  <span className="kitchen-baking-label">Oven Temp</span>
                  <span className="kitchen-baking-value">{pp.ovenTemp}</span>
                </div>
              </div>
              <div className="kitchen-baking-item">
                <div>
                  <span className="kitchen-baking-label">Bake Time</span>
                  <span className="kitchen-baking-value">{pp.bakeTime} min</span>
                </div>
              </div>
              <div className="kitchen-baking-item">
                <div>
                  <span className="kitchen-baking-label">Per Batch</span>
                  <span className="kitchen-baking-value">{pp.recipe?.batchYield || '—'} units</span>
                </div>
              </div>
            </div>

            {/* Ingredient Checklist */}
            {pp.ingredients.length > 0 && (
              <div className="kitchen-ingredients">
                <p className="kitchen-ingredients-title">Ingredients Needed</p>
                <div className="kitchen-ingredient-grid">
                  {pp.ingredients.map((ing, j) => (
                    <div key={j} className="kitchen-ingredient-row">
                      <span className="kitchen-checkbox">&#9633;</span>
                      <span className="kitchen-ingredient-name">{ing.name}</span>
                      <span className="kitchen-ingredient-qty">{ing.requiredQty.toFixed(0)} {ing.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batch Tally */}
            <div className="kitchen-tally">
              <p className="kitchen-tally-title">Batch Progress</p>
              <div className="kitchen-tally-boxes">
                {Array.from({ length: pp.batches }).map((_, i) => (
                  <span key={i} className="kitchen-tally-box">&#9633;</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="kitchen-footer">
        <div className="kitchen-footer-left">
          <span>Little Bliss Bakery — Kitchen Order</span>
        </div>
        <div className="kitchen-footer-right">
          <span>{new Date().toLocaleDateString('en-SZ', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </footer>
    </article>
  );
}
