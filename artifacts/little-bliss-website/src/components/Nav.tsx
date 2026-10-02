import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { Btn, cx, Logo } from './ui';

const LINKS = [
  { label: 'Home', href: '#top' },
  { label: 'Shop', href: '#shop' },
  { label: 'Promotions', href: '#promotions' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Reviews', href: '#testimonials' },
  { label: 'About', href: '#about' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
];

export function Nav({ count, onOpenCart }: { count: number; onOpenCart: () => void }) {
  const { scrollY } = useScroll();
  const [compact, setCompact] = useState(false);
  const [menu, setMenu] = useState(false);
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setCompact(y > 24);
    setHidden(y > 420 && y > prev && !menu);
  });

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menu]);

  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  return (
    <>
      <header
        className={cx(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          hidden && '-translate-y-full',
          compact
            ? 'border-b border-ink/8 bg-background/85 py-2 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent py-4',
        )}
      >
        <nav className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#top" className="shrink-0" aria-label="Little Bliss Bakery, home">
            <Logo compact={compact} />
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={cx(
                    'relative rounded-full px-3.5 py-2 text-sm font-medium text-ink/75 transition-colors hover:text-ink',
                    'after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:bg-berry after:transition-transform after:duration-300 hover:after:scale-x-100',
                  )}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            <button
              onClick={onOpenCart}
              aria-label={`Open box, ${count} item${count === 1 ? '' : 's'}`}
              className="relative grid h-11 w-11 place-items-center rounded-full border border-ink/12 bg-surface text-ink transition-colors hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry/40"
            >
              <ShoppingBag size={18} strokeWidth={2} />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 24 }}
                    className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-berry px-1 text-[10.5px] font-bold text-cream"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <a href="#shop" className="hidden lg:block">
              <Btn size="sm" variant="primary">Order now</Btn>
            </a>

            <button
              onClick={() => setMenu(true)}
              aria-label="Open menu"
              className="grid h-11 w-11 place-items-center rounded-full border border-ink/12 bg-surface text-ink lg:hidden"
            >
              <Menu size={19} />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div
            className="fixed inset-0 z-[60] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={() => setMenu(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-background shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
                <Logo />
                <button
                  onClick={() => setMenu(false)}
                  aria-label="Close menu"
                  className="grid h-10 w-10 place-items-center rounded-full border border-ink/12"
                >
                  <X size={18} />
                </button>
              </div>

              <ul className="flex-1 overflow-y-auto px-5 py-6">
                {LINKS.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.05, duration: 0.35 }}
                  >
                    <a
                      href={l.href}
                      onClick={() => setMenu(false)}
                      className="flex items-baseline gap-3 border-b border-ink/6 py-4 font-display text-2xl font-semibold text-ink"
                    >
                      <span className="mono text-[10px] text-berry/60">{String(i + 1).padStart(2, '0')}</span>
                      {l.label}
                    </a>
                  </motion.li>
                ))}
              </ul>

              <div className="border-t border-ink/8 p-5">
                <Btn
                  className="w-full"
                  size="lg"
                  onClick={() => { setMenu(false); document.querySelector('#shop')?.scrollIntoView({ behavior: 'smooth' }); }}
                >
                  Shop our treats
                </Btn>
                <p className="mt-3 text-center text-xs text-ink-soft">Baked fresh every morning in Malkerns.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
