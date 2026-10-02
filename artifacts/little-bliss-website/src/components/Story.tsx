import { Reveal, Section, Wrap } from './ui';
import { FloatingCharacter } from './FloatingCharacter';
import { STORY_STATS } from '@/data/site';

export function Story() {
  return (
    <Section id="about" tone="ink" className="overflow-hidden py-16 sm:py-24">
      <span aria-hidden className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-berry/25 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-pistachio/18 blur-3xl" />

      <Wrap className="relative">
        <FloatingCharacter 
          src="/Characters/Our Story.png" 
          alt="Our story character" 
          position="right"
          size="lg"
          topPosition="top-[70%]"
        />
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* image composition */}
          <Reveal className="order-2 lg:order-1">
            <div className="relative">
              <div className="ph grain overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-cream/12">
                <img
                  src="/little-bliss-cover.png"
                  alt="The Little Bliss counter, laid out for the morning"
                  className="aspect-[4/5] w-full object-cover object-right"
                  loading="lazy"
                />
              </div>

              <div className="absolute -bottom-6 -right-2 w-40 overflow-hidden rounded-2xl bg-cream p-1.5 shadow-float sm:-right-6 sm:w-48">
                <div className="ph grain overflow-hidden rounded-xl">
                  <img
                    src="/little-bliss-logo.jpg"
                    alt="Little Bliss Bakery mark"
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="px-2 py-2 text-center font-display text-[13px] font-semibold text-ink">
                  Est. 2016 · Malkerns
                </p>
              </div>

              <div className="absolute -left-3 top-6 rounded-2xl bg-peach px-4 py-3 text-ink shadow-float sm:-left-6">
                <p className="font-display text-lg font-semibold leading-none">6am</p>
                <p className="mt-1 text-[10.5px] uppercase tracking-wider text-ink/70">Ovens on</p>
              </div>
            </div>
          </Reveal>

          {/* copy */}
          <div className="order-1 lg:order-2">
            <Reveal>
              <p className="eyebrow mb-3 text-pistachio">Our story</p>
              <h2 className="font-display text-[2.1rem] leading-[1.06] font-semibold text-cream sm:text-[2.8rem]">
                One oven, two hands,
                <br />
                and a lot of <span className="text-peach">early mornings</span>
              </h2>
            </Reveal>

            <Reveal delay={1}>
              <div className="mt-6 space-y-4 text-[15.5px] leading-relaxed text-cream/72">
                <p>
                  Little Bliss started at a kitchen table with one tray of oatmeal pies and a
                  stubborn belief that a treat should taste like someone actually made it.
                  Nine years later we still mix by hand, still proof overnight, and still
                  refuse to sell anything we wouldn’t hand to our own kids.
                </p>
                <p>
                  Everything on the counter is made in small batches from a short list of
                  ingredients you can pronounce. When something sells out, it’s because we
                  baked it that morning — not because a truck delivered it.
                </p>
              </div>
            </Reveal>

            <Reveal delay={2}>
              <figure className="mt-7 border-l-2 border-peach pl-5">
                <blockquote className="font-display text-[19px] leading-snug italic text-cream/90">
                  “If it doesn’t make someone pause mid-bite, it doesn’t leave the kitchen.”
                </blockquote>
                <figcaption className="mt-2 text-[13px] text-cream/55">Thandi M. — founder & head baker</figcaption>
              </figure>
            </Reveal>

            <Reveal delay={3}>
              <dl className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-cream/12 sm:grid-cols-4">
                {STORY_STATS.map((s) => (
                  <div key={s.label} className="bg-ink px-4 py-4 text-center">
                    <dt className="sr-only">{s.label}</dt>
                    <dd>
                      <span className="font-display block text-2xl font-semibold text-peach">{s.value}</span>
                      <span className="mt-1 block text-[11px] leading-tight text-cream/55">{s.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </Wrap>
    </Section>
  );
}
