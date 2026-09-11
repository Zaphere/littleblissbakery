import { costOfRecipe, type Recipe, type Store } from '@/lib/store';

type RecipesPrintDocumentProps = {
  recipes: Recipe[];
  store: Store;
};

const rp = (n: number) =>
  `E${n.toLocaleString('en-SZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function RecipesPrintDocument({ recipes, store }: RecipesPrintDocumentProps) {
  return (
    <article className="printable-report report-paper" aria-label="Recipes">
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
            <span>Total Recipes</span>
            <strong>{recipes.length}</strong>
          </div>
          <div className="report-title">Recipe Book</div>
        </div>
      </header>

      <section className="report-products">
        {recipes.map((recipe) => {
          const batchCost = costOfRecipe(recipe, store.ingredients);
          const missing = recipe.ingredients.filter(row => {
            const ing = store.ingredients.find(i => i.id === row.ingredientId);
            return !ing || !unitCost(ing);
          }).length;

          return (
            <div key={recipe.id} className="report-product-block">
              <div className="report-product-header">
                <strong>{recipe.name || 'Unnamed Recipe'}</strong>
                <span>Yield: {recipe.batchYield} · {recipe.ingredients.length} ingredients</span>
                <span className="mono">{missing ? 'Needs pricing' : rp(batchCost)}</span>
              </div>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th className="right">Quantity</th>
                    <th className="right">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {recipe.ingredients.map((row, idx) => {
                    const ing = store.ingredients.find(i => i.id === row.ingredientId);
                    return (
                      <tr key={idx}>
                        <td>{ing?.name || 'Unknown'}</td>
                        <td className="right mono">{row.quantity}</td>
                        <td className="right">{row.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(recipe.doughWeight > 0 || recipe.finishedWeight > 0) && (
                <div className="report-product-footer">
                  {recipe.doughWeight > 0 && <span>Dough weight: <strong className="mono">{recipe.doughWeight}g</strong></span>}
                  {recipe.finishedWeight > 0 && <span> · Finished: <strong className="mono">{recipe.finishedWeight}g</strong></span>}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <footer className="report-footer">
        <span>Little Bliss Bakery — Recipe Book</span>
        <span>{new Date().toLocaleDateString('en-SZ', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </footer>
    </article>
  );
}

function unitCost(i: { packSize: number; purchasePrice: number }): number | null {
  return i.packSize > 0 && i.purchasePrice > 0 ? i.purchasePrice / i.packSize : null;
}
