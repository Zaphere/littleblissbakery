import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { CONTACT } from '@/data/site';
import { Btn, Reveal, Wrap, cx } from './ui';

const STEPS = [
  { n: '01', title: 'Pick your treats', copy: 'Add anything from the counter to your box.' },
  { n: '02', title: 'We box it fresh', copy: 'Everything is packed the morning you collect.' },
  { n: '03', title: 'Collect or deliver', copy: 'Free pickup in Malkerns. Delivery within 20km.' },
];

export function OrderCTA({ onOpenCart, count }: { onOpenCart: () => void; count: number }) {
  const [demo, setDemo] = useState(false);

  return (
    <section id="order" className="relative overflow-hidden bg-berry py-16 text-cream sm:py-24">
      <span aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-peach/35 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -right-16 bottom-[-6rem] h-72 w-72 rounded-full bg-pistachio/25 blur-3xl" />

      <Wrap className="relative">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div>
            <Reveal>
              <p className="eyebrow mb-3 text-peach">Ordering</p>
              <h2 className="font-display text-[2.3rem] leading-[1.04] font-semibold sm:text-[3.1rem]">
                Ready when
                <br />
                you are.
              </h2>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed text-cream/78">
                Order online for pickup, message us on WhatsApp, or just walk in —
                the counter is open from 6:30am.
              </p>
            </Reveal>

            <Reveal delay={1}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Btn variant="cream" size="lg" onClick={onOpenCart} icon={<ShoppingBag size={17} />}>
                  {count > 0 ? `Review box (${count})` : 'Start an order'}
                </Btn>
                <button
                  onClick={() => setDemo(true)}
                  className="inline-flex h-13 items-center gap-2 rounded-full border border-cream/35 bg-transparent px-7 text-[15px] font-semibold text-cream transition-colors hover:bg-cream/12"
                >
                  <MessageCircle size={17} /> WhatsApp us
                </button>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <div className="mt-7 flex items-center gap-2 text-[13.5px] text-cream/70">
                <Phone size={15} />
                <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="underline-offset-4 hover:underline">
                  {CONTACT.phone}
                </a>
              </div>
            </Reveal>

            <motion.div
              initial={false}
              animate={demo ? { opacity: 1, y: 0, height: 'auto' } : { opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-cream/25 bg-cream/10 p-4">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pistachio text-ink">
                  <MessageCircle size={14} />
                </span>
                <div className="text-[13.5px] leading-relaxed text-cream/85">
                  <p className="font-semibold text-cream">Demo interaction</p>
                  <p className="mt-0.5">
                    In the finished site this opens a WhatsApp chat pre-filled with your box.
                    Nothing is sent from this prototype.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid gap-4 self-center">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i + 1}>
                <div className="flex items-start gap-5 rounded-2xl border border-cream/18 bg-cream/8 p-5 backdrop-blur transition-colors hover:bg-cream/12 sm:p-6">
                  <span className="font-mono shrink-0 text-[13px] font-semibold text-peach">{s.n}</span>
                  <div>
                    <h3 className="font-display text-[19px] font-semibold text-cream">{s.title}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-cream/70">{s.copy}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span className="ml-auto hidden self-center text-cream/30 sm:block">
                      <ArrowRight size={17} />
                    </span>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Wrap>

      <div className={cx('pointer-events-none absolute inset-0', 'opacity-[0.06]')} aria-hidden>
        <svg className="h-full w-full" aria-hidden="true">
          <defs>
            <pattern id="order-dots" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="#fff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#order-dots)" />
        </svg>
      </div>
    </section>
  );
}
