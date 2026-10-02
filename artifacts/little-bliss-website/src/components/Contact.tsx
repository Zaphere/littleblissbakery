import { Clock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { CONTACT, HOURS } from '@/data/site';
import { Badge, Btn, Reveal, Section, SectionHead, Wrap, cx } from './ui';

function MiniMap() {
  return (
    <div className="ph grain relative overflow-hidden rounded-card border border-ink/10 bg-[hsl(48_40%_88%)] shadow-card">
      <svg viewBox="0 0 480 320" className="h-full w-full" role="img" aria-label="Map showing Little Bliss Bakery on Mill Lane">
        <rect width="480" height="320" fill="hsl(48 40% 88%)" />
        {/* blocks */}
        {[
          [20, 24, 130, 90], [176, 24, 110, 60], [312, 40, 150, 74],
          [20, 150, 96, 70], [140, 130, 140, 110], [306, 150, 160, 60],
          [20, 250, 200, 56], [250, 236, 216, 70],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="7" fill={i % 3 === 0 ? 'hsl(78 30% 82%)' : 'hsl(40 35% 80%)'} />
        ))}
        {/* roads */}
        <g stroke="hsl(40 25% 96%)" strokeLinecap="round" fill="none">
          <path d="M0 132 H480" strokeWidth="24" />
          <path d="M164 0 V320" strokeWidth="20" />
          <path d="M296 0 V320" strokeWidth="16" />
          <path d="M0 232 H480" strokeWidth="14" />
        </g>
        <g stroke="hsl(40 30% 70%)" strokeWidth="1.5" strokeDasharray="7 9" fill="none">
          <path d="M0 132 H480" />
          <path d="M164 0 V320" />
        </g>
        <text x="14" y="124" fontFamily="DM Sans, sans-serif" fontSize="11" fill="hsl(338 15% 45%)" letterSpacing="1.2">MILL LANE</text>
        <text x="172" y="300" fontFamily="DM Sans, sans-serif" fontSize="11" fill="hsl(338 15% 45%)" letterSpacing="1.2">BAKER ST</text>

        {/* pin */}
        <g transform="translate(214 96)">
          <ellipse cx="14" cy="44" rx="18" ry="6" fill="hsl(338 40% 20% / .22)" />
          <path
            d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 27 14 27s14-16.5 14-27C28 6.3 21.7 0 14 0z"
            fill="hsl(338 45% 39%)"
          />
          <circle cx="14" cy="13.5" r="5.5" fill="hsl(40 55% 97%)" />
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 rounded-xl bg-background/92 px-3.5 py-2.5 shadow-card backdrop-blur">
        <p className="text-[12.5px] font-semibold text-ink">{CONTACT.address[0]}</p>
        <p className="text-[11.5px] text-ink-soft">{CONTACT.address.slice(1).join(', ')}</p>
      </div>

      <a
        href="#contact"
        className="absolute right-3 top-3 rounded-full bg-ink px-3.5 py-2 text-[12px] font-semibold text-cream transition-colors hover:bg-berry"
      >
        Get directions
      </a>
    </div>
  );
}

export function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', message: '' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => { setSent(false); setForm({ name: '', contact: '', message: '' }); }, 3200);
  };

  const field =
    'w-full rounded-xl border border-ink/14 bg-surface px-4 py-3 text-[14.5px] text-ink placeholder:text-ink-soft/70 outline-none transition-colors focus:border-berry focus:ring-2 focus:ring-berry/15';

  return (
    <Section id="contact" tone="cream" className="py-16 sm:py-24">
      <Wrap>
        <SectionHead
          eyebrow="Find us"
          title={
            <>
              Come say <span className="text-berry">hello</span>
            </>
          }
          sub="We’re the warm smell on Mill Lane around half past six. Drop in, or send a note and we’ll get back the same day."
        />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* map + details */}
          <div className="flex flex-col gap-5">
            <Reveal>
              <MiniMap />
            </Reveal>

            <Reveal delay={1}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-card border border-ink/10 bg-surface p-5 shadow-card">
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-berry-tint text-berry">
                    <Clock size={18} />
                  </span>
                  <h3 className="font-display text-[17px] font-semibold text-ink">Opening hours</h3>
                  <dl className="mt-3 space-y-2">
                    {HOURS.map((h) => (
                      <div key={h.day} className="flex items-baseline justify-between gap-3 border-b border-ink/6 pb-2 last:border-0 last:pb-0">
                        <dt className="text-[13.5px] text-ink-soft">{h.day}</dt>
                        <dd className="font-mono text-[12.5px] font-medium text-ink">{h.time}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="rounded-card border border-ink/10 bg-surface p-5 shadow-card">
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-pistachio-tint text-pistachio-deep">
                    <MapPin size={18} />
                  </span>
                  <h3 className="font-display text-[17px] font-semibold text-ink">The bakery</h3>
                  <address className="mt-3 space-y-2 not-italic text-[13.5px] text-ink-soft">
                    <p className="flex items-start gap-2">
                      <Phone size={14} className="mt-1 shrink-0 text-berry" />
                      <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`} className="hover:text-ink">{CONTACT.phone}</a>
                    </p>
                    <p className="flex items-start gap-2">
                      <Mail size={14} className="mt-1 shrink-0 text-berry" />
                      <a href={`mailto:${CONTACT.email}`} className="break-all hover:text-ink">{CONTACT.email}</a>
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin size={14} className="mt-1 shrink-0 text-berry" />
                      <span>{CONTACT.address.join(', ')}</span>
                    </p>
                  </address>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {CONTACT.social.map((s) => (
                      <span key={s} className="rounded-full bg-oat px-2.5 py-1 text-[11px] font-medium text-ink-soft">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* message form */}
          <Reveal delay={2}>
            <div className="relative h-full overflow-hidden rounded-card border border-ink/10 bg-surface p-6 shadow-card sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-berry text-cream">
                  <MessageCircle size={19} />
                </span>
                <div>
                  <h3 className="font-display text-[19px] font-semibold leading-tight text-ink">Send us a note</h3>
                  <p className="text-[13px] text-ink-soft">Custom cakes, large orders, or a quick question.</p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-3.5">
                <div>
                  <label htmlFor="c-name" className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">Name</label>
                  <input
                    id="c-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    className={field}
                  />
                </div>
                <div>
                  <label htmlFor="c-contact" className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">Phone or email</label>
                  <input
                    id="c-contact"
                    required
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    placeholder="How should we reply?"
                    className={field}
                  />
                </div>
                <div>
                  <label htmlFor="c-msg" className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">Message</label>
                  <textarea
                    id="c-msg"
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="I'd like a 6-inch celebration cake for Saturday…"
                    className={cx(field, 'resize-none')}
                  />
                </div>

                <Btn type="submit" size="lg" className="w-full" icon={<Send size={16} />}>
                  {sent ? 'Thanks — we’ll be in touch' : 'Send message'}
                </Btn>
              </form>

              <p className="mt-4 text-center text-[11.5px] text-ink-soft">
                Prototype form — nothing is transmitted.
              </p>

              {sent && (
                <div className="absolute inset-x-6 bottom-6 sm:inset-x-7">
                  <div className="flex items-center gap-3 rounded-2xl border border-pistachio/50 bg-pistachio-tint px-4 py-3 text-[13.5px] text-ink shadow-card">
                    <Badge tone="pistachio">Demo</Badge>
                    Your note would be on its way. Thanks for trying the prototype!
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </Wrap>
    </Section>
  );
}
