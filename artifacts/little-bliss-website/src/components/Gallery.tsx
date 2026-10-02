import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GALLERY } from '@/data/site';
import { FoodArt } from './FoodArt';
import { Reveal, Section, SectionHead, Wrap } from './ui';

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((v) => (v === null ? v : (v + 1) % GALLERY.length));
      if (e.key === 'ArrowLeft') setOpen((v) => (v === null ? v : (v - 1 + GALLERY.length) % GALLERY.length));
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!autoPlay || open === null) return;
    const interval = setInterval(() => {
      setOpen((v) => (v === null ? v : (v + 1) % GALLERY.length));
    }, 3000);
    return () => clearInterval(interval);
  }, [autoPlay, open]);

  return (
    <Section id="gallery" className="py-16 sm:py-24">
      <Wrap>
        <SectionHead
          eyebrow="From the counter"
          title={
            <>
              What it looks like <span className="text-berry">on a good day</span>
            </>
          }
          sub="A rolling snapshot of the tray, the box and the table. Tap any photo to open it."
        />

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {GALLERY.map((g, i) => (
            <Reveal key={g.id} delay={i % 4} className="aspect-square">
              <button
                onClick={() => setOpen(i)}
                className="group relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-ink/10 transition-all duration-300 hover:ring-berry/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berry"
              >
                <img src={g.image} alt={g.caption} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.08]" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/8 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="absolute inset-x-4 bottom-3 translate-y-2 text-left text-[13px] font-semibold text-cream opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  {g.caption}
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </Wrap>

      <AnimatePresence>
        {open !== null && (
          <motion.div
            className="fixed inset-0 z-[70] grid place-items-center bg-ink/92 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
          >
            <button
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-cream/25 text-cream transition-colors hover:bg-cream/10"
            >
              <X size={19} />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setAutoPlay(!autoPlay); }}
              aria-label={autoPlay ? 'Pause' : 'Play'}
              className="absolute left-3 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-cream/25 text-cream transition-colors hover:bg-cream/10"
            >
              {autoPlay ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + GALLERY.length) % GALLERY.length); }}
              aria-label="Previous"
              className="absolute left-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-cream/25 text-cream transition-colors hover:bg-cream/10 sm:left-8"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % GALLERY.length); }}
              aria-label="Next"
              className="absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-cream/25 text-cream transition-colors hover:bg-cream/10 sm:right-8"
            >
              <ChevronRight size={20} />
            </button>

            <motion.figure
              key={GALLERY[open].id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl"
            >
              <div className="overflow-hidden rounded-3xl ring-1 ring-cream/15">
                <img src={GALLERY[open].image} alt={GALLERY[open].caption} className="aspect-[4/3] w-full object-cover" />
              </div>
              <figcaption className="mt-4 flex items-center justify-between gap-4 text-cream">
                <span className="font-display text-lg font-semibold">{GALLERY[open].caption}</span>
                <span className="font-mono text-[12px] text-cream/55">
                  {open + 1} / {GALLERY.length}
                </span>
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
