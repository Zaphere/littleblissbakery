import { motion, type Variants } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const cx = (...v: (string | false | null | undefined)[]) => v.filter(Boolean).join(' ');

export const money = (n: number) => `E${n.toFixed(2)}`;

/* ---------------------------------------------------------------- Reveal --- */

const rise: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function Reveal({
  children,
  delay = 0,
  className = '',
  as = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'section';
}) {
  const M = motion[as] as typeof motion.div;
  return (
    <M
      className={className}
      custom={delay}
      variants={rise}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </M>
  );
}

/* --------------------------------------------------------------- Section --- */

export function Section({
  id,
  children,
  className = '',
  tone = 'plain',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: 'plain' | 'cream' | 'ink' | 'berry';
}) {
  const tones = {
    plain: 'bg-background',
    cream: 'bg-cream',
    ink: 'bg-ink text-cream',
    berry: 'bg-berry text-cream',
  } as const;
  return (
    <section id={id} className={cx('relative', tones[tone], className)}>
      {children}
    </section>
  );
}

export function Wrap({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-[1200px] px-5 sm:px-8', className)}>{children}</div>;
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  align = 'left',
  invert = false,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  align?: 'left' | 'center';
  invert?: boolean;
  action?: ReactNode;
}) {
  return (
    <div
      className={cx(
        'mb-9 flex flex-col gap-5 sm:mb-12',
        align === 'center' ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between',
      )}
    >
      <div className={cx(align === 'center' && 'max-w-2xl')}>
        <Reveal>
          <p className={cx('eyebrow mb-3', invert ? 'text-pistachio' : 'text-berry')}>{eyebrow}</p>
          <h2
            className={cx(
              'font-display text-[2.1rem] leading-[1.05] font-semibold sm:text-[2.9rem]',
              invert ? 'text-cream' : 'text-ink',
            )}
          >
            {title}
          </h2>
          {sub && (
            <p className={cx('mt-4 max-w-xl text-[15px] leading-relaxed', invert ? 'text-cream/70' : 'text-ink-soft')}>
              {sub}
            </p>
          )}
        </Reveal>
      </div>
      {action && <Reveal delay={1}>{action}</Reveal>}
    </div>
  );
}

/* ---------------------------------------------------------------- Button --- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'cream' | 'outline';
  size?: 'md' | 'lg' | 'sm';
  icon?: ReactNode;
};

export function Btn({ variant = 'primary', size = 'md', icon, children, className = '', ...rest }: BtnProps) {
  const base =
    'group inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 will-change-transform active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50';
  const sizes = {
    sm: 'h-9 px-4 text-[13px]',
    md: 'h-11 px-5 text-sm',
    lg: 'h-13 px-7 text-[15px]',
  } as const;
  const variants = {
    primary: 'bg-berry text-cream shadow-[0_10px_24px_-12px_hsl(338_60%_35%)] hover:bg-berry-deep hover:shadow-[0_16px_30px_-12px_hsl(338_60%_30%)]',
    ghost: 'bg-transparent text-ink hover:bg-ink/6',
    cream: 'bg-cream text-ink hover:bg-white',
    outline: 'border border-ink/20 bg-transparent text-ink hover:border-ink/40 hover:bg-ink/4',
  } as const;
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} {...rest}>
      {children}
      {icon && <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>}
    </button>
  );
}

/* ----------------------------------------------------------------- Logo --- */

export function Logo({ compact = false, invert = false }: { compact?: boolean; invert?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src="/little-bliss-logo.jpg"
        alt=""
        width={34}
        height={34}
        className={cx(
          'rounded-full object-cover ring-2 ring-berry/25',
          compact ? 'h-8 w-8' : 'h-9 w-9',
        )}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cx(
            'font-display text-[17px] font-semibold tracking-tight',
            invert ? 'text-cream' : 'text-ink',
          )}
        >
          Little Bliss
        </span>
        <span
          className={cx(
            'eyebrow mt-0.5 !text-[8.5px]',
            invert ? 'text-pistachio/80' : 'text-berry/70',
          )}
        >
          Bakery
        </span>
      </span>
    </span>
  );
}

/* ----------------------------------------------------------------- Badge --- */

export function Badge({ children, tone = 'berry' }: { children: ReactNode; tone?: 'berry' | 'pistachio' | 'peach' | 'ink' }) {
  const tones = {
    berry: 'bg-berry text-cream',
    pistachio: 'bg-pistachio text-ink',
    peach: 'bg-peach text-ink',
    ink: 'bg-ink text-cream',
  } as const;
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-wide uppercase', tones[tone])}>
      {children}
    </span>
  );
}
