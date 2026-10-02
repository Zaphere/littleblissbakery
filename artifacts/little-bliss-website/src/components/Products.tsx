import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORIES, PRODUCTS, type Category, type Product } from '@/data/site';
import { CustomCookieBuilder } from './CustomCookieBuilder';
import { FloatingCharacter } from './FloatingCharacter';
import { FoodArt } from './FoodArt';
import { Badge, Btn, Reveal, Section, SectionHead, Wrap, cx, money } from './ui';

function Card({ p, i, onAdd }: { p: Product; i: number; onAdd: (id: string) => void }) {
  const singlePrice = Math.round(p.price / 12);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, delay: (i % 4) * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-card border border-ink/8 bg-surface shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-ink/16 hover:shadow-lift"
    >
      <div className="relative overflow-hidden">
        <img src={p.image} alt={p.name} className="aspect-[5/4] w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
        {p.badge && (
          <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
            <Badge tone={p.badge === 'New' ? 'pistachio' : p.badge === 'Best seller' ? 'berry' : 'peach'}>
              {p.badge}
            </Badge>
          </div>
        )}
        <div className="absolute inset-x-2 bottom-2 sm:inset-x-3 sm:bottom-3 flex translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            onClick={() => onAdd(p.id)}
            className="flex h-8 w-full items-center justify-center gap-1 rounded-full bg-ink/92 text-[11px] font-semibold text-cream backdrop-blur transition-colors hover:bg-ink sm:h-10 sm:text-[13px] sm:gap-1.5"
          >
            <Plus size={12} className="sm:size-[15px]" /> Add to box
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div>
            <h3 className="font-display text-[14px] font-semibold leading-tight text-ink sm:text-[17px]">{p.name}</h3>
            <p className="mt-0.5 text-[11px] text-ink-soft sm:mt-1 sm:text-[12.5px]">{p.unit}</p>
          </div>
          <div className="text-right">
            <p className="font-display shrink-0 text-[15px] font-semibold text-berry sm:text-[19px]">{money(p.price)}</p>
            <p className="text-[9px] text-ink-soft sm:text-[11px]">{money(singlePrice)} each</p>
          </div>
        </div>

        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft sm:mt-2.5 sm:text-[13.5px]">{p.blurb}</p>

        <div className="mt-auto flex flex-wrap items-center gap-1 pt-3 sm:pt-4 sm:gap-1.5">
          {p.tags.map((t) => (
            <span key={t} className="rounded-full bg-oat px-2 py-0.5 text-[9px] font-medium text-ink-soft sm:px-2.5 sm:py-1 sm:text-[10.5px]">
              {t}
            </span>
          ))}
          <button
            onClick={() => onAdd(p.id)}
            aria-label={`Add ${p.name} to box`}
            className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-ink/14 text-ink transition-colors hover:border-berry hover:bg-berry hover:text-cream lg:hidden sm:h-9 sm:w-9"
          >
            <Plus size={14} className="sm:size-[16px]" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function Products({ onAdd }: { onAdd: (id: string) => void }) {
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const list = useMemo(
    () => (filter === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter)),
    [filter],
  );

  return (
    <Section id="shop" className="py-16 sm:py-24">
      <Wrap className="relative">
        <FloatingCharacter 
          src="/Characters/Cutom biscuits.png" 
          alt="Custom biscuits character" 
          position="right"
          size="lg"
        />
        <SectionHead
          eyebrow="The counter"
          title={
            <>
              Straight from <span className="text-berry">the oven</span>
            </>
          }
          sub="Everything below is baked the morning you order it. Pick a few, build a box, and we’ll have it boxed and ribboned in minutes."
          action={
            <div className="hidden items-center gap-2 rounded-full border border-ink/12 bg-surface px-4 py-2.5 text-[13px] text-ink-soft sm:flex">
              <Sparkles size={15} className="text-peach-deep" />
              {PRODUCTS.length} treats on the board
            </div>
          }
        />

        <div className="mb-8 flex flex-wrap gap-2">
          {(['All', ...CATEGORIES] as const).map((c) => (
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

        <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => (
              <Card key={p.id} p={p} i={i} onAdd={onAdd} />
            ))}
          </AnimatePresence>
        </motion.div>

        <Reveal delay={1}>
          <CustomCookieBuilder onAdd={onAdd} />
        </Reveal>
      </Wrap>
    </Section>
  );
}
