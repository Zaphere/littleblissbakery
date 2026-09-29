import type { Ingredient, Recipe } from '@/lib/store';
import { costOfRecipe, recipeCostIssues, recipeIssueLabel, roundCurrency } from '@/lib/store';

type BakingReferenceCardProps = {
  recipes: Recipe[];
  ingredients?: Ingredient[];
};

export function BakingReferenceCards({ recipes, ingredients }: BakingReferenceCardProps) {
  if (!recipes.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => {
        const issues = ingredients ? recipeCostIssues(recipe, ingredients) : null;
        const batchCost = ingredients ? costOfRecipe(recipe, ingredients) : null;

        return (
          <div key={recipe.id} className="overflow-hidden rounded-xl border-2 border-primary/30 bg-card">
            <div className="bg-primary px-4 py-3 text-center text-primary-foreground">
              <h3 className="text-sm font-bold uppercase tracking-wide">{recipe.name || 'Unnamed Recipe'}</h3>
            </div>
            <div className="space-y-1.5 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Batch yield</span>
                <span className="font-bold">{recipe.batchYield || 24} pcs</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dozens</span>
                <span className="font-bold">{((recipe.batchYield || 24) / 12).toFixed(1)} dozen</span>
              </div>
              <div className="my-2 border-t border-dashed border-border" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Oven</span>
                <span className="font-bold text-primary">{recipe.ovenTemp || '170–180°C'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bake time</span>
                <span className="font-bold text-primary">{recipe.bakeTimeMinutes || 14} min</span>
              </div>
              {batchCost !== null && (
                <>
                  <div className="my-2 border-t border-dashed border-border" />
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Batch cost</span>
                    <span className="text-right">
                      <span className="font-bold">{`E${roundCurrency(batchCost).toFixed(2)}`}</span>
                      {issues && issues.count > 0 && <span className="block text-[10px] font-medium text-destructive">{recipeIssueLabel(issues)}</span>}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
