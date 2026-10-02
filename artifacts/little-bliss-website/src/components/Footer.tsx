import { Instagram, Facebook, MessageCircle } from 'lucide-react';
import { CONTACT, PRODUCTS } from '@/data/site';
import { Logo, cx } from './ui';

const SOCIAL_ICON: Record<string, typeof Instagram> = {
  Instagram,
  Facebook,
  WhatsApp: MessageCircle,
};

const COLUMNS = [
  { title: 'Shop', links: PRODUCTS.slice(0, 5).map((p) => ({ label: p.name, href: '#shop' })) },
  {
    title: 'Bakery',
    links: [
      { label: 'Our story', href: '#about' },
      { label: 'Gallery', href: '#gallery' },
      { label: 'Reviews', href: '#testimonials' },
      { label: 'Promotions', href: '#promotions' },
      { label: 'Opening hours', href: '#contact' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    title: 'Ordering',
    links: [
      { label: 'Start an order', href: '#order' },
      { label: 'Custom cakes', href: '#order' },
      { label: 'Party trays', href: '#order' },
      { label: 'Delivery & pickup', href: '#order' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-cream">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]">
        <svg className="h-full w-full">
          <defs>
            <pattern id="foot-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.6" fill="#fff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#foot-dots)" />
        </svg>
      </div>

      <div className="relative mx-auto w-full max-w-[1200px] px-5 pt-14 pb-8 sm:px-8">
        <div className="grid gap-10 border-b border-cream/12 pb-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo invert />
            <p className="mt-4 text-[14.5px] leading-relaxed text-cream/62">
              Homemade-style treats baked fresh every morning in Malkerns.
              Come for the cookies, stay for the smell.
            </p>
            <div className="mt-5 flex gap-2">
              {CONTACT.social.map((s) => {
                const Icon = SOCIAL_ICON[s] ?? Instagram;
                return (
                  <a
                    key={s}
                    href="#contact"
                    aria-label={s}
                    className="grid h-10 w-10 place-items-center rounded-full border border-cream/20 text-cream/75 transition-colors hover:border-peach hover:bg-peach hover:text-ink"
                  >
                    <Icon size={17} />
                  </a>
                );
              })}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="eyebrow mb-4 text-peach">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((l, i) => (
                  <li key={`${l.label}-${i}`}>
                    <a
                      href={l.href}
                      className="text-[14px] text-cream/65 transition-colors hover:text-cream"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-4 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-cream/50">
            © {new Date().getFullYear()} Little Bliss Bakery. Frontend prototype — no real orders are processed.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {['Privacy', 'Terms', 'Allergens', 'Newsletter'].map((x) => (
              <li key={x}>
                <a
                  href={x === 'Newsletter' ? '#newsletter' : '#contact'}
                  className={cx('text-[12.5px] text-cream/50 transition-colors hover:text-cream/85')}
                >
                  {x}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
