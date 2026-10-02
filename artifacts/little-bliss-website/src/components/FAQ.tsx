import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { FAQS } from '@/data/site';
import { Badge, Reveal, Section, SectionHead, Wrap, cx } from './ui';

const CATEGORIES = Array.from(new Set(FAQS.map((f) => f.category)));

export function FAQ() {
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? FAQS.filter((f) => f.category === filter) : FAQS;

  const toggle = (id: string) => {
    setOpen(open === id ? null : id);
  };

  return (
    <Section id="faq" className="py-16 sm:py-24">
      <Wrap>
        <SectionHead
          eyebrow="Questions?"
          title={
            <>
              Everything you need to <span className="text-berry">know</span>
            </>
          }
          sub="From ordering to allergens, we've got answers. Can't find what you're looking for? Drop us a message."
        />

        {/* Category filters */}
        <Reveal delay={1}>
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter(null)}
              className={cx(
                'rounded-full px-4 py-2 text-[13.5px] font-semibold transition-all duration-200',
                filter === null
                  ? 'bg-ink text-cream shadow-[0_8px_20px_-12px_hsl(338_30%_20%)]'
                  : 'border border-ink/12 bg-surface text-ink-soft hover:border-ink/30 hover:text-ink',
              )}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={cx(
                  'rounded-full px-4 py-2 text-[13.5px] font-semibold transition-all duration-200',
                  filter === c
                    ? 'bg-ink text-cream shadow-[0_8px_20px_-12px_hsl(338_30%_20%)]'
                    : 'border border-ink/12 bg-surface text-ink-soft hover:border-ink/30 hover:text-ink',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </Reveal>

        {/* FAQ items */}
        <div className="space-y-3">
          {filtered.map((faq, i) => (
            <Reveal key={faq.id} delay={i % 4}>
              <div
                className={cx(
                  'overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-card transition-all duration-300',
                  open === faq.id && 'border-berry/30 shadow-lift',
                )}
              >
                <button
                  onClick={() => toggle(faq.id)}
                  className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-ink/[0.02] sm:p-6"
                  aria-expanded={open === faq.id}
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-berry-tint text-berry">
                    <HelpCircle size={18} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-display text-[17px] font-semibold leading-snug text-ink sm:text-[18px]">
                        {faq.question}
                      </h3>
                      <motion.span
                        animate={{ rotate: open === faq.id ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="shrink-0 text-ink-soft"
                      >
                        <ChevronDown size={20} />
                      </motion.span>
                    </div>
                    <AnimatePresence>
                      {open === faq.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 text-[14.5px] leading-relaxed text-ink-soft">
                            {faq.answer}
                          </div>
                          <div className="mt-3">
                            <Badge tone="pistachio">{faq.category}</Badge>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              </div>
            </Reveal>
          ))}
        </div>

        {/* CTA */}
        <Reveal delay={filtered.length + 1}>
          <div className="mt-10 rounded-2xl border border-dashed border-berry/35 bg-berry-tint px-6 py-8 text-center">
            <p className="font-display text-xl font-semibold text-ink">Still have questions?</p>
            <p className="mt-2 max-w-md mx-auto text-[14.5px] text-ink-soft">
              We're happy to help with custom orders, dietary needs, or anything else on your mind.
            </p>
            <a href="#contact" className="mt-4 inline-block">
              <span className="inline-flex items-center gap-2 rounded-full bg-berry px-6 py-3 text-[14px] font-semibold text-cream transition-colors hover:bg-berry-deep">
                Get in touch
              </span>
            </a>
          </div>
        </Reveal>
      </Wrap>
    </Section>
  );
}
