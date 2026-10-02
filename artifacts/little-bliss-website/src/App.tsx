import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CartDrawer, type CartLine } from '@/components/CartDrawer';
import { Contact } from '@/components/Contact';
import { FAQ } from '@/components/FAQ';
import { Footer } from '@/components/Footer';
import { Gallery } from '@/components/Gallery';
import { Hero } from '@/components/Hero';
import { Nav } from '@/components/Nav';
import { Newsletter } from '@/components/Newsletter';
import { OrderCTA } from '@/components/OrderCTA';
import { Products } from '@/components/Products';
import { Promotions } from '@/components/Promotions';
import { Story } from '@/components/Story';
import { Testimonials } from '@/components/Testimonials';
import { PRODUCTS } from '@/data/site';

export default function App() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);

  const add = useCallback((id: string) => {
    setLines((prev) => {
      const found = prev.find((l) => l.id === id);
      return found
        ? prev.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l))
        : [...prev, { id, qty: 1 }];
    });
    const product = PRODUCTS.find((p) => p.id === id);
    if (product) {
      setToast(product.name);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), 2200);
    }
  }, []);

  const qty = useCallback((id: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="min-h-screen bg-background">
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[55] h-[3px] origin-left bg-berry transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />

      <Nav count={count} onOpenCart={() => setCartOpen(true)} />

      <main>
        <Hero onAdd={add} />
        <Products onAdd={add} />
        <Promotions />
        <Gallery />
        <Testimonials />
        <Story />
        <OrderCTA count={count} onOpenCart={() => setCartOpen(true)} />
        <FAQ />
        <Newsletter />
        <Contact />
      </main>

      <Footer />

      <CartDrawer
        open={cartOpen}
        lines={lines}
        onClose={() => setCartOpen(false)}
        onQty={qty}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 left-1/2 z-[75] -translate-x-1/2 sm:left-6 sm:translate-x-0"
          >
            <div className="flex items-center gap-3 rounded-full border border-ink/10 bg-ink py-2.5 pl-3 pr-4 text-cream shadow-lift">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-pistachio text-ink">
                <Check size={15} strokeWidth={3} />
              </span>
              <span className="text-[13.5px] font-medium">
                {toast} <span className="text-cream/60">added to your box</span>
              </span>
              <button
                onClick={() => setCartOpen(true)}
                className="ml-1 text-[13px] font-semibold text-peach hover:underline"
              >
                View box
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
