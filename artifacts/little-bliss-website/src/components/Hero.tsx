import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { useRef } from 'react';
import { FoodArt } from './FoodArt';
import { Btn, Reveal, Wrap, cx } from './ui';

const ease = [0.16, 1, 0.3, 1] as const;

function Sparkle({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className={cx('absolute h-5 w-5 text-peach-deep', className)}
      initial={{ opacity: 0, scale: 0.4, rotate: -30 }}
      animate={{ opacity: [0, 1, 0.4, 1], scale: [0.4, 1, 0.9, 1], rotate: -30 }}
      transition={{ duration: 2.4, delay, repeat: Infinity, repeatType: 'reverse' }}
      aria-hidden="true"
    >
      <path fill="currentColor" d="M12 0c.9 6.2 4.9 10.2 11.1 11.1v1.8C16.9 13.8 12.9 17.8 12 24c-.9-6.2-4.9-10.2-11.1-11.1v-1.8C7.1 10.2 11.1 6.2 12 0Z" />
    </motion.svg>
  );
}


export function Hero({ onAdd }: { onAdd: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yPhoto = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const yFloat = useTransform(scrollYProgress, [0, 1], [0, 40]);

  return (
    <div ref={ref} id="top" className="relative overflow-hidden pt-24 pb-0 sm:pt-28">
      {/* warm wash behind everything */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(80% 60% at 12% 12%, hsl(24 80% 94%) 0%, transparent 60%), radial-gradient(70% 55% at 88% 22%, hsl(338 50% 94%) 0%, transparent 62%), radial-gradient(60% 50% at 50% 100%, hsl(78 46% 92%) 0%, transparent 65%)',
        }}
      />
      <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-pistachio/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-8 h-64 w-64 rounded-full bg-peach/35 blur-3xl" />

      <Wrap className="relative">
        <div className="grid items-center gap-12 pb-16 lg:grid-cols-[1.02fr_1fr] lg:gap-8 lg:pb-24">
          {/* ------------------------------------------------------------ copy */}
          <div className="max-w-xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-berry/25 bg-surface/80 px-3 py-1.5 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-berry" />
                <span className="eyebrow !tracking-[0.16em] text-berry">Little Bliss Bakery</span>
              </span>
            </Reveal>

            <Reveal delay={1}>
              <h1 className="font-display mt-6 text-[2.75rem] leading-[0.98] font-semibold tracking-tight text-ink sm:text-[3.8rem] lg:text-[4.35rem]">
                A Little Bliss
                <br />
                in{' '}
                <span className="relative inline-block text-berry">
                  Every Bite
                  <svg
                    viewBox="0 0 300 16"
                    preserveAspectRatio="none"
                    className="absolute -bottom-1.5 left-0 h-3 w-full text-peach"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 11c46-7 96-9 148-7 44 2 88 5 144 9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>
            </Reveal>

            <Reveal delay={2}>
              <p className="mt-7 max-w-md text-[16.5px] leading-relaxed text-ink-soft">
                Homemade-style treats, baked with care and made to brighten your day.
                Cookies, tarts, cakes and warm breads — pulled from the oven before the town wakes up.
              </p>
            </Reveal>

            <Reveal delay={3}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#shop">
                  <Btn size="lg" icon={<ArrowRight size={17} />}>Shop our treats</Btn>
                </a>
                <a href="#about">
                  <Btn size="lg" variant="outline">Explore the bakery</Btn>
                </a>
              </div>
            </Reveal>

            <Reveal delay={4}>
              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-ink/10 pt-6">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={14} className="fill-honey text-honey" />
                  ))}
                  <span className="ml-1 text-[13px] font-semibold text-ink">4.9</span>
                  <span className="text-[13px] text-ink-soft">· 214 reviews</span>
                </div>
                <span className="text-[13px] text-ink-soft">Family-run since 2016</span>
                <span className="text-[13px] text-ink-soft">Order by 4pm for next-day</span>
              </div>
            </Reveal>
          </div>

          {/* --------------------------------------------------------- imagery */}
          <div className="relative mx-auto w-full max-w-[540px] lg:max-w-none">
            <div className="relative aspect-[4/4.4] sm:aspect-[4/3.6] lg:aspect-[4/4.4]">
              {/* main photograph */}
              <motion.div
                style={{ y: yPhoto }}
                initial={{ opacity: 0, y: 30, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: -3 }}
                transition={{ duration: 0.9, ease }}
                className="absolute inset-x-[8%] top-0 h-[76%] overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-ink/10"
              >
                <img
                  src="/little-bliss-cover.jpg"
                  alt="A spread of freshly baked Little Bliss treats"
                  className="h-full w-full object-cover object-left"
                  loading="eager"
                  decoding="async"
                  width={1200}
                  height={669}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 rounded-full bg-background/90 px-3 py-1.5 text-[11.5px] font-semibold text-ink backdrop-blur">
                  This morning’s bake
                </div>
              </motion.div>

              {/* floating product card — top right */}
              <motion.div
                style={{ y: yFloat }}
                initial={{ opacity: 0, scale: 0.86, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.35, ease }}
                className="absolute -right-1 top-[6%] w-[43%]"
              >
                <div className="animate-drift" style={{ ['--r' as string]: '4deg' }}>
                  <button
                    onClick={() => onAdd('strawberry-tart')}
                    className="block w-full overflow-hidden rounded-2xl bg-surface p-2 text-left shadow-float ring-1 ring-ink/10 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <FoodArt kind="berrytart" className="aspect-square w-full rounded-xl" />
                    <div className="px-1.5 pb-1 pt-2.5">
                      <p className="text-[12.5px] font-semibold leading-tight text-ink">Strawberry Tarts</p>
                      <p className="mt-0.5 text-[11px] text-ink-soft">Fresh · E6.50</p>
                    </div>
                  </button>
                </div>
              </motion.div>

              {/* floating product card — bottom left */}
              <motion.div
                initial={{ opacity: 0, scale: 0.86, x: -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.5, ease }}
                className="absolute -left-2 bottom-[6%] w-[44%]"
              >
                <div className="animate-drift-slow" style={{ ['--r' as string]: '-5deg' }}>
                  <button
                    onClick={() => onAdd('choc-chip')}
                    className="block w-full overflow-hidden rounded-2xl bg-surface p-2 text-left shadow-float ring-1 ring-ink/10 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <FoodArt kind="chocchip" className="aspect-square w-full rounded-xl" />
                    <div className="px-1.5 pb-1 pt-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[12.5px] font-semibold leading-tight text-ink">Choc Chip</p>
                        <p className="mt-0.5 text-[11px] text-ink-soft">Box of 6 · E4.50</p>
                      </div>
                      <span className="rounded-full bg-berry px-2 py-1 text-[9.5px] font-bold uppercase text-cream">Add</span>
                    </div>
                  </button>
                </div>
              </motion.div>

              {/* floating rating pill */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7, ease }}
                className="absolute right-[4%] bottom-[24%] rounded-2xl bg-ink px-4 py-3 text-cream shadow-float"
              >
                <p className="font-display text-xl font-semibold leading-none">4.9</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-cream/60">Local rating</p>
              </motion.div>

              <Sparkle className="left-[2%] top-[14%]" delay={0.2} />
              <Sparkle className="right-[10%] top-[54%] !h-4 !w-4 text-berry" delay={0.9} />
              <Sparkle className="left-[36%] bottom-[2%] !h-3.5 !w-3.5" delay={1.4} />
            </div>
          </div>
        </div>
      </Wrap>

    </div>
  );
}
