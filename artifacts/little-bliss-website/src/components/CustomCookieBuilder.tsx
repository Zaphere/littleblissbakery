import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { FloatingCharacter } from './FloatingCharacter';
import { Btn, cx, money } from './ui';

const BASE_COOKIES = [
  { id: 'choc-chip', name: 'Chocolate Chip', price: 180 },
  { id: 'oat-raisin', name: 'Oat & Raisin', price: 180 },
  { id: 'dark-choc-chip', name: 'Dark Chocolate Chip', price: 180 },
  { id: 'oatmeal-pie', name: 'Oatmeal Pie', price: 250 },
  { id: 'strawberry-tart', name: 'Strawberry Tart', price: 200 },
  { id: 'chocolate-brownies', name: 'Chocolate Brownie', price: 270 },
];

const ADD_INS = [
  { id: 'extra-choc', name: 'Extra Chocolate Chips', price: 20 },
  { id: 'nuts', name: 'Chopped Nuts', price: 25 },
  { id: 'dried-fruit', name: 'Dried Fruit Mix', price: 30 },
  { id: 'sprinkles', name: 'Colorful Sprinkles', price: 15 },
  { id: 'coconut', name: 'Toasted Coconut', price: 20 },
  { id: 'caramel', name: 'Caramel Drizzle', price: 25 },
];

export function CustomCookieBuilder({ onAdd }: { onAdd: (id: string) => void }) {
  const [selectedBase, setSelectedBase] = useState<string | null>(null);
  const [selectedAddIns, setSelectedAddIns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(12);
  const [expanded, setExpanded] = useState(false);

  const baseCookie = BASE_COOKIES.find(b => b.id === selectedBase);
  const addInItems = ADD_INS.filter(a => selectedAddIns.includes(a.id));
  
  const basePrice = baseCookie ? baseCookie.price : 0;
  const addInPrice = addInItems.reduce((sum, a) => sum + a.price, 0);
  const totalPricePerDozen = basePrice + addInPrice;
  const totalPrice = Math.round((totalPricePerDozen / 12) * quantity);

  const toggleAddIn = (id: string) => {
    setSelectedAddIns(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const canAddToCart = selectedBase !== null && quantity >= 12;

  const handleAddToCart = () => {
    if (canAddToCart && baseCookie) {
      // For now, we'll add the base cookie with a note about customizations
      // In a real implementation, this would create a custom order
      onAdd(baseCookie.id);
      setExpanded(false);
      setSelectedBase(null);
      setSelectedAddIns([]);
      setQuantity(12);
    }
  };

  return (
    <div className="mt-10 rounded-card border border-dashed border-berry/35 bg-berry-tint px-4 py-6 sm:px-6 sm:py-8 relative">
      <FloatingCharacter 
        src="/Characters/Custom make.png" 
        alt="Custom make character" 
        position="left"
        size="md"
      />
      <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
        <p className="font-display text-lg font-semibold text-ink sm:text-xl">Build Your Own Custom Box</p>
        <p className="max-w-lg text-[13px] text-ink-soft sm:text-[14.5px]">
          Create your perfect cookie combination! Choose your base, add your favorite mix-ins, and order a minimum of 12 cookies.
        </p>
        
        <Btn
          onClick={() => setExpanded(!expanded)}
          variant="outline"
          icon={expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        >
          {expanded ? 'Hide Builder' : 'Start Building'}
        </Btn>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 overflow-hidden"
          >
            {/* Step 1: Choose Base Cookie */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-ink">Step 1: Choose Your Base Cookie</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {BASE_COOKIES.map((cookie) => (
                  <button
                    key={cookie.id}
                    onClick={() => setSelectedBase(cookie.id)}
                    className={cx(
                      'rounded-xl border p-3 text-left transition-all',
                      selectedBase === cookie.id
                        ? 'border-berry bg-berry/10 ring-2 ring-berry/20'
                        : 'border-ink/10 bg-surface hover:border-ink/30'
                    )}
                  >
                    <p className="text-sm font-medium text-ink">{cookie.name}</p>
                    <p className="text-xs text-ink-soft">{money(cookie.price)}/dozen</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Choose Add-ins */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-ink">Step 2: Add Mix-ins (Optional)</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ADD_INS.map((addIn) => (
                  <button
                    key={addIn.id}
                    onClick={() => toggleAddIn(addIn.id)}
                    className={cx(
                      'flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all',
                      selectedAddIns.includes(addIn.id)
                        ? 'border-berry bg-berry/10'
                        : 'border-ink/10 bg-surface hover:border-ink/30'
                    )}
                  >
                    <div className={cx(
                      'grid h-5 w-5 place-items-center rounded-full border',
                      selectedAddIns.includes(addIn.id)
                        ? 'border-berry bg-berry text-cream'
                        : 'border-ink/20'
                    )}>
                      {selectedAddIns.includes(addIn.id) && <Check size={12} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-ink">{addIn.name}</p>
                      <p className="text-[10px] text-ink-soft">+{money(addIn.price)}/dozen</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Set Quantity */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-ink">Step 3: Set Quantity (Minimum 12)</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(12, quantity - 1))}
                  disabled={quantity <= 12}
                  className="grid h-10 w-10 place-items-center rounded-full border border-ink/14 text-ink transition-colors hover:border-berry hover:bg-berry hover:text-cream disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus size={16} />
                </button>
                <div className="flex min-w-[100px] items-center justify-center rounded-xl border border-ink/10 bg-surface px-4 py-2">
                  <span className="font-display text-xl font-semibold text-ink">{quantity}</span>
                </div>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-ink/14 text-ink transition-colors hover:border-berry hover:bg-berry hover:text-cream"
                >
                  <Plus size={16} />
                </button>
              </div>
              {quantity < 12 && (
                <p className="mt-2 text-xs text-berry">Minimum order is 12 cookies</p>
              )}
            </div>

            {/* Price Summary */}
            <div className="mb-6 rounded-xl border border-ink/10 bg-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-ink">Price Summary</h3>
              <div className="space-y-2 text-sm">
                {baseCookie && (
                  <div className="flex justify-between">
                    <span className="text-ink-soft">{baseCookie.name} base</span>
                    <span className="font-medium text-ink">{money(basePrice)}/dozen</span>
                  </div>
                )}
                {addInItems.map((addIn) => (
                  <div key={addIn.id} className="flex justify-between">
                    <span className="text-ink-soft">{addIn.name}</span>
                    <span className="font-medium text-ink">+{money(addIn.price)}/dozen</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-ink/10 pt-2">
                  <span className="font-semibold text-ink">Price per dozen</span>
                  <span className="font-display font-semibold text-berry">{money(totalPricePerDozen)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Quantity ({quantity} cookies)</span>
                  <span className="font-medium text-ink">{quantity} × {money(Math.round(totalPricePerDozen / 12))}</span>
                </div>
                <div className="flex justify-between border-t border-ink/10 pt-2">
                  <span className="font-display text-lg font-semibold text-ink">Total</span>
                  <span className="font-display text-lg font-semibold text-berry">{money(totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Btn
              size="lg"
              className="w-full"
              disabled={!canAddToCart}
              onClick={handleAddToCart}
            >
              {canAddToCart ? `Add Custom Box to Cart · ${money(totalPrice)}` : 'Select a base cookie to continue'}
            </Btn>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
