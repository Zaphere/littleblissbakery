import { unitCost, costOfRecipe, ingredientUsageForOrder, type Order, type Store } from '@/lib/store';

type BakingReportDocumentProps = {
  order: Order;
  store: Store;
};

const rp = (n: number) =>
  `E${n.toLocaleString('en-SZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const rd = (v: string) =>
  new Date(`${v}T00:00:00`).toLocaleDateString('en-SZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export function BakingReportDocument({ order, store }: BakingReportDocumentProps) {
  const orderTotal = order.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0) - order.discount + order.deliveryFee;
  const orderCost = order.items.reduce((a, i) => a + i.quantity * i.costSnapshot, 0);
  const usage = ingredientUsageForOrder(order, store.recipes, store.products, store.ingredients);
  const linkedExpenses = store.expenses.filter(e => e.relatedOrderId === order.id);
  const totalExpenses = linkedExpenses.reduce((s, e) => s + e.amount, 0);
  const profit = orderTotal - orderCost - totalExpenses;

  const perProduct = order.items.map(item => {
    const product = store.products.find(p => p.id === item.productId);
    const recipe = store.recipes.find(r => r.productId === item.productId);
    const batches = product ? item.quantity / product.batchYield : 0;
    const ingredients = recipe ? recipe.ingredients.map(row => {
      const ing = store.ingredients.find(i => i.id === row.ingredientId);
      const usedQty = row.quantity * batches;
      const up = ing ? unitCost(ing) : null;
      return {
        name: ing?.name || 'Unknown',
        unit: row.unit,
        usedQty,
        currentStock: ing?.currentStock || 0,
        remaining: Math.max(0, (ing?.currentStock || 0) - usedQty),
        cost: up !== null ? up * usedQty : null,
      };
    }) : [];
    const batchCost = recipe ? costOfRecipe(recipe, store.ingredients) : 0;
    return {
      product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      batches,
      ingredients,
      batchCost,
      lineCost: item.quantity * item.costSnapshot,
      lineRevenue: item.quantity * item.unitPrice,
    };
  });

  const stockRows = store.ingredients
    .filter(i => usage[i.id] > 0)
    .map(i => {
      const remaining = i.currentStock - usage[i.id];
      const pct = i.currentStock > 0 ? remaining / i.currentStock : 0;
      return { ...i, used: usage[i.id], remaining, pct };
    });

  return (
    <article className="printable-report report-paper" aria-label={`Baking report for ${order.invoiceNumber}`}>
      {/* Header */}
      <header className="report-header">
        <div className="report-logo">
          <img src="/little-bliss-logo.jpg" alt="Little Bliss Bakery" className="h-16 w-auto object-contain" />
        </div>
        <div className="report-company">
          <strong>Little Bliss Bakery</strong>
          <span>P.O. Box 2700</span>
          <span>Matsapha, Eswatini</span>
          <span>Cell: +268 621 0474</span>
          <span>morrelloblue@gmail.com</span>
        </div>
        <div className="report-meta">
          <div className="report-meta-row">
            <span>Invoice No.</span>
            <strong>{order.invoiceNumber}</strong>
          </div>
          <div className="report-meta-row">
            <span>Customer</span>
            <strong>{order.customerName}</strong>
          </div>
          <div className="report-title">Baking Report</div>
        </div>
      </header>

      {/* Order Info */}
      <section className="report-info-grid">
        <div>
          <h2>Order Details</h2>
          <dl>
            <div><dt>Date</dt><dd>{rd(order.orderDate)}</dd></div>
            <div><dt>Due</dt><dd>{rd(order.dueDate)}</dd></div>
            <div><dt>Phone</dt><dd>{order.phone || '—'}</dd></div>
          </dl>
        </div>
        <div>
          <h2>Financial Summary</h2>
          <dl>
            <div><dt>Total</dt><dd className="mono">{rp(orderTotal)}</dd></div>
            <div><dt>Cost</dt><dd className="mono">{rp(orderCost)}</dd></div>
            <div><dt>Expenses</dt><dd className="mono">{rp(totalExpenses)}</dd></div>
            <div><dt>Profit</dt><dd className={`mono ${profit >= 0 ? 'report-positive' : 'report-negative'}`}>{rp(profit)}</dd></div>
          </dl>
        </div>
      </section>

      {/* Products */}
      <section className="report-products">
        <h2>Products &amp; Ingredients Used</h2>
        {perProduct.map((pp, idx) => (
          <div key={idx} className="report-product-block">
            <div className="report-product-header">
              <strong>{pp.product?.name || 'Unknown'}</strong>
              <span>{pp.quantity} units · {pp.batches.toFixed(1)} batches</span>
              <span className="mono">{rp(pp.lineRevenue)}</span>
            </div>
            {pp.ingredients.length > 0 ? (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th className="right">Used</th>
                    <th className="right">Left</th>
                    <th className="right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {pp.ingredients.map((ing, j) => (
                    <tr key={j}>
                      <td>{ing.name}</td>
                      <td className="right mono">{ing.usedQty.toFixed(0)} {ing.unit}</td>
                      <td className={`right mono ${ing.remaining <= 0 ? 'report-negative' : ''}`}>{ing.remaining.toFixed(0)} {ing.unit}</td>
                      <td className="right mono">{ing.cost !== null ? rp(ing.cost) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="report-empty">No recipe linked</p>
            )}
            <div className="report-product-footer">
              <span>Batch cost: <strong className="mono">{rp(pp.batchCost)}</strong></span>
            </div>
          </div>
        ))}
      </section>

      {/* Stock Summary */}
      {stockRows.length > 0 && (
        <section className="report-stock">
          <h2>Ingredient Stock Summary</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th className="right">Before</th>
                <th className="right">Used</th>
                <th className="right">After</th>
                <th className="right">Status</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="right mono">{r.currentStock}{r.unit}</td>
                  <td className="right mono report-positive">−{r.used.toFixed(0)}{r.unit}</td>
                  <td className="right mono">{r.remaining.toFixed(0)}{r.unit}</td>
                  <td className="right">
                    <span className={`report-badge ${r.remaining <= 0 ? 'badge-out' : r.pct < 0.3 ? 'badge-low' : 'badge-ok'}`}>
                      {r.remaining <= 0 ? 'Out' : r.pct < 0.3 ? 'Low' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Linked Expenses */}
      {linkedExpenses.length > 0 && (
        <section className="report-expenses">
          <h2>Linked Expenses</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Date</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {linkedExpenses.map(e => (
                <tr key={e.id}>
                  <td>{e.description}</td>
                  <td>{e.category}</td>
                  <td>{rd(e.date)}</td>
                  <td className="right mono">{rp(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="report-footer">
        <span>Little Bliss Bakery — Baking Report</span>
        <span>{new Date().toLocaleDateString('en-SZ', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </footer>
    </article>
  );
}
