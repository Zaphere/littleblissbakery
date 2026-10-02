import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { useState } from 'react';
import { TESTIMONIALS } from '@/data/site';
import { FloatingCharacter } from './FloatingCharacter';
import { Reveal, Section, SectionHead, Wrap, cx } from './ui';

export function Testimonials() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(0);

  const next = () => {
    setDirection(1);
    setActive((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const prev = () => {
    setDirection(-1);
    setActive((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const current = TESTIMONIALS[active];

  return (
    <Section id="testimonials" tone="cream" className="py-16 sm:py-24">
      <Wrap className="relative">
        <FloatingCharacter 
          src="/Characters/Comments.png" 
          alt="Comments character" 
          position="right"
          size="lg"
        />
        <SectionHead
          eyebrow="What people say"
          title={
            <>
              Sweet words from <span className="text-berry">happy customers</span>
            </>
          }
          sub="Real reviews from Malkerns and beyond. Every cookie, cake and loaf that leaves our counter carries a bit of that love."
        />

        <div className="mt-12 relative">
          {/* Main testimonial card */}
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-surface p-8 shadow-card sm:p-12">
              <div className="absolute left-6 top-6 text-berry/20">
                <Quote size={48} strokeWidth={1.5} />
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative"
                >
                  <div className="mb-6 flex items-center gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        size={18}
                        className={i < current.rating ? 'fill-honey text-honey' : 'text-ink/20'}
                      />
                    ))}
                  </div>

                  <blockquote className="font-display text-xl leading-relaxed text-ink sm:text-2xl">
                    "{current.text}"
                  </blockquote>

                  <div className="mt-8 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display text-lg font-semibold text-ink">{current.name}</p>
                      <p className="text-sm text-ink-soft">
                        {current.location} · {current.date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={prev}
                        aria-label="Previous testimonial"
                        className="grid h-11 w-11 place-items-center rounded-full border border-ink/12 text-ink transition-colors hover:border-berry hover:bg-berry hover:text-cream"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={next}
                        aria-label="Next testimonial"
                        className="grid h-11 w-11 place-items-center rounded-full border border-ink/12 text-ink transition-colors hover:border-berry hover:bg-berry hover:text-cream"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>

          {/* Thumbnail strip */}
          <Reveal delay={1}>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setDirection(i > active ? 1 : -1);
                    setActive(i);
                  }}
                  aria-label={`View testimonial from ${t.name}`}
                  className={cx(
                    'h-2 w-2 rounded-full transition-all duration-300',
                    i === active ? 'h-2.5 w-8 bg-berry' : 'bg-ink/20 hover:bg-ink/40'
                  )}
                />
              ))}
            </div>
          </Reveal>
        </div>

        {/* Trust badges */}
        <Reveal delay={2}>
          <div className="mt-16 grid gap-6 sm:grid-cols-3">
            {[
              { label: 'Average rating', value: '4.9', sub: 'From 214 reviews' },
              { label: 'Repeat customers', value: '85%', sub: 'Come back monthly' },
              { label: 'Since', value: '2016', sub: 'Baking with love' },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-2xl border border-ink/10 bg-surface p-6 text-center shadow-card"
              >
                <p className="font-display text-3xl font-semibold text-berry">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-ink">{stat.label}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{stat.sub}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Wrap>
    </Section>
  );
}
