import { Check, Copy, Tag } from 'lucide-react';
import { useState } from 'react';
import { PROMOTIONS, type Promotion } from '@/data/site';
import { FoodArt } from './FoodArt';
import { Btn, Reveal, Section, SectionHead, Wrap, cx } from './ui';

const tones: Record<Promotion['tone'], { bg: string; text: string; chip: string; btn: Variant }> = {
  berry: {
    bg: 'bg-berry',
    text: 'text-cream',
    chip: 'bg-cream/16 text-cream border-cream/30',
    btn: 'cream',
  },
  pistachio: {
    bg: 'bg-pistachio-tint',
    text: 'text-ink',
    chip: 'bg-ink/8 text-ink border-ink/20',
    btn: 'primary',
  },
  peach: {
    bg: 'bg-peach-tint',
    text: 'text-ink',
    chip: 'bg-ink/8 text-ink border-ink/20',
    btn: 'primary',
  },
};

type Variant = 'primary' | 'ghost' | 'cream' | 'outline';

function PromoCard({ p, i }: { p: Promotion; i: number }) {
  const t = tones[p.tone];
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.code);
    } catch {
      /* clipboard is optional in a demo */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Reveal delay={i} className={cx('h-full', i === 0 && 'lg:col-span-2')}>
      <article
        className={cx(
          'group relative flex h-full flex-col overflow-hidden rounded-card shadow-card transition-transform duration-300 hover:-translate-y-1',
          t.bg,
          t.text,
        )}
      >
        <div className={cx('grid gap-4 p-4 sm:gap-6 sm:p-7', i === 0 ? 'sm:grid-cols-[1.25fr_0.75fr] sm:items-center' : 'flex-1')}>
          <div className="flex flex-col justify-between">
            <div>
              <p className={cx('eyebrow mb-2 sm:mb-3', p.tone === 'berry' ? 'text-peach' : 'text-berry')}>{p.eyebrow}</p>
              <h3 className="font-display text-[1.3rem] leading-[1.08] font-semibold sm:text-[1.7rem] sm:leading-[1.08] lg:text-[2rem]">{p.title}</h3>
              <p
                className={cx(
                  'mt-2 max-w-md text-[12.5px] leading-relaxed sm:mt-3 sm:text-[14.5px]',
                  p.tone === 'berry' ? 'text-cream/78' : 'text-ink-soft',
                )}
              >
                {p.copy}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-3">
              <button
                onClick={copy}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.14em] transition-colors sm:px-3.5 sm:py-2 sm:text-[12.5px] sm:gap-2',
                  t.chip,
                )}
                aria-label={`Copy promo code ${p.code}`}
              >
                {copied ? <Check size={11} className="sm:size-[13px]" /> : <Copy size={11} className="sm:size-[13px]" />}
                {p.code}
              </button>
              <a href="#shop">
                <Btn variant={t.btn} size="sm" icon={<Tag size={12} className="sm:size-[14px]" />}>
                  Use this deal
                </Btn>
              </a>
            </div>
          </div>

          <div className={cx(i === 0 ? 'hidden sm:block' : 'mt-3 sm:mt-5')}>
            <div className="overflow-hidden rounded-2xl ring-1 ring-ink/10">
              <FoodArt kind={p.kind} className={cx('w-full', i === 0 ? 'aspect-[4/3] sm:aspect-square' : 'aspect-[16/10]')} />
            </div>
          </div>
        </div>

        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-40 blur-2xl sm:-right-10 sm:-top-10 sm:h-40 sm:w-40',
            p.tone === 'berry' ? 'bg-peach/50' : 'bg-white/70',
          )}
        />
      </article>
    </Reveal>
  );
}

export function Promotions() {
  return (
    <Section id="promotions" tone="cream" className="py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 text-background">
        <div className="scallop h-3.5 rotate-180" />
      </div>

      <Wrap>
        <SectionHead
          eyebrow="On right now"
          title={
            <>
              A little something <span className="text-berry">extra</span>
            </>
          }
          sub="Standing offers we keep running because the town keeps asking for them."
          action={
            <Reveal delay={1}>
              <div className="rounded-full border border-ink/12 bg-surface px-4 py-2.5 text-[13px] text-ink-soft">
                Valid until the end of the month
              </div>
            </Reveal>
          }
        />

        <div className="grid gap-5 lg:grid-cols-2">
          {PROMOTIONS.map((p, i) => (
            <PromoCard key={p.id} p={p} i={i} />
          ))}
        </div>
      </Wrap>
    </Section>
  );
}
