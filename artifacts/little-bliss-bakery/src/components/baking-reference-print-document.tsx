import type { Ingredient, Recipe } from '@/lib/store';

type BakingReferencePrintDocumentProps = {
  recipes: Recipe[];
  ingredients?: Ingredient[];
};

export function BakingReferencePrintDocument({ recipes }: BakingReferencePrintDocumentProps) {
  return (
    <article className="printable-report report-paper" aria-label="Baking Reference Cards">
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
            <span>Total Recipes</span>
            <strong>{recipes.length}</strong>
          </div>
          <div className="report-title">Baking Reference</div>
        </div>
      </header>

      <section className="baking-ref-grid">
        {recipes.map((recipe) => {
          const isPies = recipe.category === 'Pies';
          const isTarts = recipe.category === 'Tarts';
          const yieldCount = recipe.batchYield || 24;
          const pieCount = yieldCount / 2;

          return (
            <div key={recipe.id} className="baking-ref-card-print">
              <div className="baking-ref-card-header">
                <h3>{recipe.name || 'Unnamed Recipe'}</h3>
              </div>
              <div className="baking-ref-card-body">
                <table className="baking-ref-table">
                  <tbody>
                    <tr>
                      <td className="baking-ref-label">1 Recipe</td>
                      <td className="baking-ref-equals">=</td>
                      <td className="baking-ref-value">1 Batch</td>
                    </tr>
                    <tr>
                      <td className="baking-ref-label">1 Batch</td>
                      <td className="baking-ref-equals">=</td>
                      <td className="baking-ref-value">
                        {isPies ? `${yieldCount} Cookies = ${pieCount} Pies` : isTarts ? `${yieldCount} Tarts` : `${yieldCount} Cookies`}
                      </td>
                    </tr>
                    <tr>
                      <td className="baking-ref-label">1 Dozen</td>
                      <td className="baking-ref-equals">=</td>
                      <td className="baking-ref-value">
                        {isPies ? '12 Cookies = 6 Pies' : isTarts ? '12 Tarts' : '12 Cookies'}
                      </td>
                    </tr>
                    <tr className="baking-ref-divider-row">
                      <td colSpan={3}><div className="baking-ref-divider" /></td>
                    </tr>
                    <tr>
                      <td className="baking-ref-label">Oven</td>
                      <td />
                      <td className="baking-ref-highlight">{recipe.ovenTemp || '170–180°C'}</td>
                    </tr>
                    <tr>
                      <td className="baking-ref-label">Bake Time</td>
                      <td />
                      <td className="baking-ref-highlight">{recipe.bakeTimeMinutes || 14} min per Biscuit/Baking Tray</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      <footer className="report-footer">
        <span>Little Bliss Bakery — Baking Reference</span>
        <span>{new Date().toLocaleDateString('en-SZ', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </footer>
    </article>
  );
}
