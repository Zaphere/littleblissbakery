import { motion } from 'framer-motion';
import { Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { Btn, Reveal, Wrap, cx } from './ui';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }, 1200);
  };

  return (
    <section id="newsletter" className="relative overflow-hidden bg-ink py-16 text-cream sm:py-24">
      {/* Decorative elements */}
      <span aria-hidden className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full bg-berry/25 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -right-16 bottom-[-4rem] h-72 w-72 rounded-full bg-pistachio/20 blur-3xl" />

      <Wrap className="relative">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* Left side - content */}
          <div>
            <Reveal>
              <p className="eyebrow mb-3 text-peach">Stay in the loop</p>
              <h2 className="font-display text-[2.3rem] leading-[1.04] font-semibold sm:text-[3.1rem]">
                Fresh from the oven,
                <br />
                straight to your inbox
              </h2>
            </Reveal>

            <Reveal delay={1}>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed text-cream/78">
                Join our newsletter for weekly specials, new product announcements, and the occasional
                baking tip. No spam — just delicious updates.
              </p>
            </Reveal>

            <Reveal delay={2}>
              <ul className="mt-6 space-y-3">
                {[
                  'Weekly specials and promotions',
                  'New product announcements',
                  'Baking tips and recipes',
                  'Event notifications',
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-3 text-[14.5px] text-cream/70">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-pistachio text-ink">
                      <svg viewBox="0 0 12 12" className="h-3 w-3">
                        <path
                          fill="currentColor"
                          d="M2 6l2.5 2.5L10 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={3}>
              <p className="mt-6 text-[12.5px] text-cream/50">
                We respect your privacy. Unsubscribe anytime.
              </p>
            </Reveal>
          </div>

          {/* Right side - signup form */}
          <div className="self-center">
            <Reveal delay={1}>
              <div className="rounded-3xl border border-cream/15 bg-cream/5 p-6 backdrop-blur sm:p-8">
                {subscribed ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-8 text-center"
                  >
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-pistachio text-ink">
                      <Mail size={28} />
                    </span>
                    <h3 className="font-display mt-5 text-2xl font-semibold text-cream">You're in!</h3>
                    <p className="mt-2 max-w-xs text-[14.5px] leading-relaxed text-cream/70">
                      Check your inbox for a welcome confirmation. The sweet stuff is on its way.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={submit} className="space-y-4">
                    <div>
                      <label htmlFor="newsletter-email" className="mb-2 block text-[12.5px] font-semibold text-cream/70">
                        Email address
                      </label>
                      <input
                        id="newsletter-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-cream/20 bg-cream/10 px-4 py-3 text-[14.5px] text-cream placeholder:text-cream/40 outline-none transition-colors focus:border-peach focus:ring-2 focus:ring-peach/20"
                      />
                    </div>

                    <Btn
                      type="submit"
                      size="lg"
                      className="w-full"
                      icon={<Send size={16} />}
                      disabled={loading}
                    >
                      {loading ? 'Signing up...' : 'Subscribe now'}
                    </Btn>

                    <p className="text-center text-[11.5px] text-cream/50">
                      Demo signup — no email is actually sent
                    </p>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </Wrap>

      {/* Background pattern */}
      <div className={cx('pointer-events-none absolute inset-0', 'opacity-[0.04]')} aria-hidden>
        <svg className="h-full w-full" aria-hidden="true">
          <defs>
            <pattern id="newsletter-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="#fff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#newsletter-dots)" />
        </svg>
      </div>
    </section>
  );
}
