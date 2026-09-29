import { unitCost, costOfRecipe, batchesFor, ingredientUsageForOrder, convertQty, calculateOrderTotal, calculateOrderCost, roundCurrency, type Order, type OrderItem, type Store } from '@/lib/store';

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
  const orderTotal = calculateOrderTotal(order.items, order.discount, order.deliveryFee, order.taxRate || 0);
  const orderCost = calculateOrderCost(order.items);
  const usage = ingredientUsageForOrder(order, store.recipes, store.ingredients);
  const linkedExpenses = store.expenses.filter(e => e.relatedOrderId === order.id);
  const totalExpenses = linkedExpenses.reduce((s, e) => s + e.amount, 0);
  const profit = orderTotal - orderCost - totalExpenses;

  const perProduct = order.items.map(item => {
    const recipe = store.recipes.find(r => r.id === item.productId);
    const batches = recipe ? batchesFor(item.quantity, recipe.batchYield) : 0;
    const ingredients = recipe ? recipe.ingredients.map(row => {
      const ing = store.ingredients.find(i => i.id === row.ingredientId);
      const recipeQty = row.quantity * batches;
      const up = ing ? unitCost(ing) : null;
      // "Left" has to sit in the pantry's unit, so convert first. When the two
      // units cannot be bridged we show the recipe figure and withhold the rest.
      const usedQty = ing ? convertQty(recipeQty, row.unit, ing.unit) : null;
      return {
        name: ing?.name || 'Unknown ingredient',
        unit: usedQty !== null && ing ? ing.unit : row.unit,
        usedQty: usedQty !== null ? usedQty : recipeQty,
        remaining: usedQty !== null && ing ? Math.max(0, ing.currentStock - usedQty) : null,
        cost: usedQty !== null && up !== null ? roundCurrency(up * usedQty) : null,
        issue: !ing ? 'not in pantry' : usedQty === null ? 'unit mismatch' : null,
      };
    }) : [];
    const batchCost = recipe ? costOfRecipe(recipe, store.ingredients) : 0;
    return {
      recipe,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      batches,
      ingredients,
      batchCost,
      lineCost: roundCurrency(item.quantity * item.costSnapshot),
      lineRevenue: roundCurrency(item.quantity * item.unitPrice),
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
          <span>+268 621 0474</span>
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
              <strong>{pp.recipe?.name || 'Unknown'}</strong>
              <span>{pp.quantity} dozen · {pp.batches} batch{pp.batches !== 1 ? 'es' : ''}</span>
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
                      <td>{ing.name}{ing.issue && <span className="report-negative"> ({ing.issue})</span>}</td>
                      <td className="right mono">{ing.usedQty.toFixed(0)} {ing.unit}</td>
                      <td className={`right mono ${ing.remaining !== null && ing.remaining <= 0 ? 'report-negative' : ''}`}>{ing.remaining !== null ? `${ing.remaining.toFixed(0)} ${ing.unit}` : '—'}</td>
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
