import type { Ingredient, Settings } from '@/lib/store';

type ShoppingListDocumentProps = {
  ingredients: Ingredient[];
  settings: Settings;
  mode: 'blank' | 'low-stock' | 'all';
  date?: string;
  boughtBy?: string;
};

const money = (n: number) =>
  `E${n.toLocaleString('en-SZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ShoppingListDocument({ ingredients, settings, mode, date = '', boughtBy = '' }: ShoppingListDocumentProps) {
  // Filter ingredients based on mode
  const filteredIngredients = mode === 'blank' 
    ? [] // Blank mode - no data
    : mode === 'low-stock'
    ? ingredients.filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock)
    : ingredients; // All ingredients

  // For blank mode, show empty rows. Otherwise carry the real reference data
  // through: pack size, supplier and the last purchase price all live on the
  // ingredient, and a suggested pack quantity is derived from the shortage.
  const displayRows = mode === 'blank'
    ? Array.from({ length: 25 }, (_, i) => ({
        name: '',
        category: '',
        packSize: '',
        unit: '',
        supplier: '',
        pricePerPack: 0,
        quantity: 0,
        lineTotal: 0,
      }))
    : filteredIngredients.map(i => {
        const shortage = Math.max(0, i.minimumStock - i.currentStock);
        const pricePerPack = i.purchasePrice || 0;
        const quantity = i.packSize > 0 ? Math.ceil(shortage / i.packSize) : 0;
        return {
          name: i.name,
          category: i.category,
          packSize: i.packSize > 0 ? String(i.packSize) : '',
          unit: i.unit,
          supplier: i.supplier || '',
          pricePerPack,
          quantity,
          lineTotal: Math.round(pricePerPack * quantity * 100) / 100,
        };
      });

  const grandTotal = displayRows.reduce((sum, row) => sum + (row.pricePerPack > 0 ? row.quantity * row.pricePerPack : 0), 0);
  const hasPrices = mode !== 'blank' && displayRows.some(row => row.pricePerPack > 0);

  return (
    <article className="printable-shopping-list shopping-list-paper" aria-label="Bakery Shopping List">
      {/* Header */}
      <header className="shopping-list-header">
        <h1 className="shopping-list-title">BAKERY SHOPPING LIST</h1>
      </header>

      {/* Instructions */}
      <section className="shopping-list-instructions">
        <p className="shopping-list-instruction-text">
          HOW TO USE: 1) Put a tick in the TICK column (click the cell, pick ✔ from the dropdown, or write a tick by hand if printed). 
          2) Write how many PACKS to buy in the yellow QTY column. 3) The cost and grand total calculate automatically. 
          Example: tick Baker's Pride Flour + Qty 2 = E170.00.
        </p>
      </section>

      {/* Date and Bought By */}
      <section className="shopping-list-meta">
        <div className="shopping-list-meta-row">
          <span className="shopping-list-label">Date:</span>
          <span className="shopping-list-value">{date || '________________'}</span>
        </div>
        <div className="shopping-list-meta-row">
          <span className="shopping-list-label">Bought by:</span>
          <span className="shopping-list-value">{boughtBy || '________________'}</span>
        </div>
      </section>

      {/* Table */}
      <table className="shopping-list-table">
        <thead>
          <tr>
            <th className="shopping-list-col-tick">TICK</th>
            <th className="shopping-list-col-item">Item</th>
            <th className="shopping-list-col-category">Category</th>
            <th className="shopping-list-col-pack-size">Pack Size</th>
            <th className="shopping-list-col-unit">Unit</th>
            <th className="shopping-list-col-supplier">Supplier</th>
            <th className="shopping-list-col-price">Price per Pack (E)</th>
            <th className="shopping-list-col-qty">QTY (packs)</th>
            <th className="shopping-list-col-total">Line Total (E)</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, index) => (
            <tr key={index}>
              <td className="shopping-list-col-tick">
                <span className="shopping-list-checkbox">&#9633;</span>
              </td>
              <td className="shopping-list-col-item">{row.name || '________________'}</td>
              <td className="shopping-list-col-category">{row.category || '________________'}</td>
              <td className="shopping-list-col-pack-size">{row.packSize || '____'}</td>
              <td className="shopping-list-col-unit">{row.unit || '___'}</td>
              <td className="shopping-list-col-supplier">{row.supplier || '________________'}</td>
              <td className="shopping-list-col-price">{mode === 'blank' ? '___' : row.pricePerPack > 0 ? money(row.pricePerPack) : '—'}</td>
              <td className="shopping-list-col-qty">{mode === 'blank' ? '___' : row.quantity}</td>
              <td className="shopping-list-col-total">{mode === 'blank' ? '___' : row.pricePerPack > 0 ? money(row.lineTotal) : '—'}</td>
            </tr>
          ))}
          {/* Fill remaining rows for blank mode */}
          {mode === 'blank' && displayRows.length < 25 && 
            Array.from({ length: 25 - displayRows.length }).map((_, i) => (
              <tr key={`blank-${i}`}>
                <td className="shopping-list-col-tick"><span className="shopping-list-checkbox">&#9633;</span></td>
                <td className="shopping-list-col-item">________________</td>
                <td className="shopping-list-col-category">________________</td>
                <td className="shopping-list-col-pack-size">____</td>
                <td className="shopping-list-col-unit">___</td>
                <td className="shopping-list-col-supplier">________________</td>
                <td className="shopping-list-col-price">___</td>
                <td className="shopping-list-col-qty">___</td>
                <td className="shopping-list-col-total">___</td>
              </tr>
            ))
          }
        </tbody>
      </table>

      {/* Grand Total */}
      <section className="shopping-list-total">
        <div className="shopping-list-total-row">
          <span className="shopping-list-total-label">GRAND TOTAL:</span>
          <span className="shopping-list-total-value">{mode === 'blank' ? 'E____.__' : hasPrices ? money(grandTotal) : '—'}</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="shopping-list-footer">
        <span>{settings.bakeryName || 'Little Bliss Bakery'}</span>
        <span>{settings.address || 'P.O. Box 2700, Matsapha, Eswatini'}</span>
      </footer>
    </article>
  );
}
