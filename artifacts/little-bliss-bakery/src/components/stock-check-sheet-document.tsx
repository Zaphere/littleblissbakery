import type { Ingredient, Recipe, Settings } from '@/lib/store';

type StockCheckSheetDocumentProps = {
  ingredients: Ingredient[];
  recipes: Recipe[];
  settings: Settings;
  mode: 'blank' | 'low-stock' | 'all';
  date?: string;
  baker?: string;
  sheetNumber?: string;
  checkedBy?: string;
};

export function StockCheckSheetDocument({ 
  ingredients, 
  recipes, 
  settings, 
  mode, 
  date = '', 
  baker = '', 
  sheetNumber = '', 
  checkedBy = '' 
}: StockCheckSheetDocumentProps) {
  // Filter ingredients based on mode
  const filteredIngredients = mode === 'blank' 
    ? [] // Blank mode - no data
    : mode === 'low-stock'
    ? ingredients.filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock)
    : ingredients; // All ingredients

  // For blank mode, show empty rows
  const displayRows = mode === 'blank' 
    ? Array.from({ length: 25 }, (_, i) => ({
        name: '',
        unit: '',
        minStock: 0,
        before: 0,
        used: 0,
        after: 0,
        buy: false,
      }))
    : filteredIngredients.map(i => ({
        name: i.name,
        unit: i.unit,
        minStock: i.minimumStock,
        before: i.currentStock,
        used: 0,
        after: i.currentStock,
        buy: i.minimumStock > 0 && i.currentStock <= i.minimumStock,
      }));

  return (
    <article className="printable-stock-check stock-check-paper" aria-label="Baking Stock Check Sheet">
      {/* Header */}
      <header className="stock-check-header">
        <h1 className="stock-check-title">BAKING STOCK CHECK SHEET</h1>
      </header>

      {/* Instructions */}
      <section className="stock-check-instructions">
        <p className="stock-check-instruction-text">
          Fill in BEFORE the bake and AFTER the bake. Next session's BEFORE = this sheet's AFTER.
        </p>
      </section>

      {/* Session Info */}
      <section className="stock-check-session">
        <div className="stock-check-session-row">
          <span className="stock-check-label">Date:</span>
          <span className="stock-check-value">{date || '________________'}</span>
        </div>
        <div className="stock-check-session-row">
          <span className="stock-check-label">Baker:</span>
          <span className="stock-check-value">{baker || '________________'}</span>
        </div>
        <div className="stock-check-session-row">
          <span className="stock-check-label">Sheet No:</span>
          <span className="stock-check-value">{sheetNumber || '____'}</span>
        </div>
        <div className="stock-check-session-row">
          <span className="stock-check-label">Checked by:</span>
          <span className="stock-check-value">{checkedBy || '________________'}</span>
        </div>
      </section>

      {/* What Was Baked */}
      <section className="stock-check-baked">
        <h2 className="stock-check-section-title">WHAT WAS BAKED? (tick)</h2>
        <div className="stock-check-baked-grid">
          {recipes.slice(0, 10).map((recipe, index) => (
            <div key={recipe.id} className="stock-check-baked-item">
              <span className="stock-check-checkbox">&#9633;</span>
              <span className="stock-check-baked-name">{recipe.name}</span>
            </div>
          ))}
          {mode === 'blank' && recipes.length < 10 && 
            Array.from({ length: 10 - recipes.length }).map((_, i) => (
              <div key={`blank-recipe-${i}`} className="stock-check-baked-item">
                <span className="stock-check-checkbox">&#9633;</span>
                <span className="stock-check-baked-name">________________</span>
              </div>
            ))
          }
        </div>
        <div className="stock-check-baked-details">
          <div className="stock-check-baked-detail">
            <span className="stock-check-label">Batches:</span>
            <span className="stock-check-value">{mode === 'blank' ? '____' : ''}</span>
          </div>
          <div className="stock-check-baked-detail">
            <span className="stock-check-label">Units made:</span>
            <span className="stock-check-value">{mode === 'blank' ? '____' : ''}</span>
          </div>
        </div>
      </section>

      {/* Stock Table */}
      <section className="stock-check-table-section">
        <table className="stock-check-table">
          <thead>
            <tr>
              <th className="stock-check-col-ingredient">Ingredient</th>
              <th className="stock-check-col-unit">Unit</th>
              <th className="stock-check-col-min">MIN STOCK</th>
              <th className="stock-check-col-before">BEFORE bake (amount in stock)</th>
              <th className="stock-check-col-used">USED in bake</th>
              <th className="stock-check-col-after">AFTER bake (Before - Used)</th>
              <th className="stock-check-col-buy">BUY?</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, index) => (
              <tr key={index}>
                <td className="stock-check-col-ingredient">{row.name || '________________'}</td>
                <td className="stock-check-col-unit">{row.unit || '___'}</td>
                <td className="stock-check-col-min">{mode === 'blank' ? '___' : row.minStock}</td>
                <td className="stock-check-col-before">{mode === 'blank' ? '___' : row.before}</td>
                <td className="stock-check-col-used">{mode === 'blank' ? '___' : row.used}</td>
                <td className="stock-check-col-after">{mode === 'blank' ? '___' : row.after}</td>
                <td className="stock-check-col-buy">
                  {mode === 'blank' ? '___' : (row.buy ? 'BUY' : '')}
                </td>
              </tr>
            ))}
            {/* Fill remaining rows for blank mode */}
            {mode === 'blank' && displayRows.length < 25 && 
              Array.from({ length: 25 - displayRows.length }).map((_, i) => (
                <tr key={`blank-${i}`}>
                  <td className="stock-check-col-ingredient">________________</td>
                  <td className="stock-check-col-unit">___</td>
                  <td className="stock-check-col-min">___</td>
                  <td className="stock-check-col-before">___</td>
                  <td className="stock-check-col-used">___</td>
                  <td className="stock-check-col-after">___</td>
                  <td className="stock-check-col-buy">___</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </section>

      {/* Footer */}
      <footer className="stock-check-footer">
        <span>{settings.bakeryName || 'Little Bliss Bakery'}</span>
        <span>{settings.address || 'P.O. Box 2700, Matsapha, Eswatini'}</span>
      </footer>
    </article>
  );
}
