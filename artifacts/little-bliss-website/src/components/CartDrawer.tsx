import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2, X, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { PRODUCTS, CONTACT } from '@/data/site';
import { FoodArt } from './FoodArt';
import { Btn, cx, money } from './ui';

export type CartLine = { id: string; qty: number };

export function CartDrawer({
  open,
  lines,
  onClose,
  onQty,
}: {
  open: boolean;
  lines: CartLine[];
  onClose: () => void;
  onQty: (id: string, delta: number) => void;
}) {
  const [placed, setPlaced] = useState(false);

  const rows = lines
    .map((l) => ({ ...l, product: PRODUCTS.find((p) => p.id === l.id)! }))
    .filter((r) => r.product);
  const subtotal = rows.reduce((s, r) => s + r.product.price * r.qty, 0);
  const delivery = subtotal > 40 || subtotal === 0 ? 0 : 3.5; // Free delivery over E40

  const close = () => {
    onClose();
    setTimeout(() => setPlaced(false), 300);
  };

  const handleWhatsAppCheckout = () => {
    const orderText = rows.map(r => 
      `${r.qty}x ${r.product.name} - ${money(r.product.price * r.qty)}`
    ).join('\n');
    
    const message = `*New Order from Little Bliss Bakery Website*\n\n${orderText}\n\n*Subtotal:* ${money(subtotal)}\n*Delivery:* ${delivery ? money(delivery) : 'Free'}\n*Total:* ${money(subtotal + delivery)}\n\nPlease confirm my order!`;
    
    const whatsappUrl = `https://wa.me/${CONTACT.whatsapp.replace('+', '').replace(/\s/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setPlaced(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={close} />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 40 }}
            role="dialog"
            aria-label="Your box"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-berry text-cream">
                  <ShoppingBag size={17} />
                </span>
                <div>
                  <h2 className="font-display text-[18px] font-semibold leading-none text-ink">Your box</h2>
                  <p className="mt-1 text-[12.5px] text-ink-soft">
                    {rows.length ? `${rows.length} line${rows.length === 1 ? '' : 's'}` : 'Nothing in here yet'}
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                aria-label="Close box"
                className="grid h-10 w-10 place-items-center rounded-full border border-ink/12 text-ink transition-colors hover:bg-ink/6"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {placed ? (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 flex flex-col items-center text-center"
                >
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-pistachio-tint text-pistachio-deep">
                    <ShoppingBag size={26} />
                  </span>
                  <h3 className="font-display mt-5 text-2xl font-semibold text-ink">Order sent!</h3>
                  <p className="mt-2 max-w-xs text-[14.5px] leading-relaxed text-ink-soft">
                    Your order has been sent to our WhatsApp. We'll confirm your order and arrange payment.
                  </p>
                  <Btn className="mt-6" onClick={close}>Keep browsing</Btn>
                </motion.div>
              ) : rows.length === 0 ? (
                <div className="mt-10 flex flex-col items-center text-center">
                  <div className="w-40 opacity-90">
                    <FoodArt kind="scone" className="aspect-square w-full rounded-full" />
                  </div>
                  <h3 className="font-display mt-5 text-xl font-semibold text-ink">Your box is empty</h3>
                  <p className="mt-2 max-w-[16rem] text-[14px] leading-relaxed text-ink-soft">
                    Add a few treats and we’ll box them fresh for you.
                  </p>
                  <Btn className="mt-5" onClick={close}>Browse the counter</Btn>
                </div>
              ) : (
                <ul className="space-y-3">
                  <AnimatePresence initial={false}>
                    {rows.map((r) => (
                      <motion.li
                        key={r.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-3"
                      >
                        <FoodArt kind={r.product.kind} className="h-16 w-16 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[14.5px] font-semibold text-ink">{r.product.name}</p>
                              <p className="mt-0.5 text-[12px] text-ink-soft">
                                {r.product.unit} · {money(r.product.price)}
                              </p>
                            </div>
                            <button
                              onClick={() => onQty(r.id, -r.qty)}
                              aria-label={`Remove ${r.product.name}`}
                              className="shrink-0 text-ink-soft transition-colors hover:text-berry"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between">
                            <div className="inline-flex items-center gap-1 rounded-full border border-ink/12 bg-background p-1">
                              <button
                                onClick={() => onQty(r.id, -1)}
                                aria-label="Decrease quantity"
                                className="grid h-7 w-7 place-items-center rounded-full text-ink transition-colors hover:bg-ink/8"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-6 text-center font-mono text-[13px] font-semibold">{r.qty}</span>
                              <button
                                onClick={() => onQty(r.id, 1)}
                                aria-label="Increase quantity"
                                className="grid h-7 w-7 place-items-center rounded-full text-ink transition-colors hover:bg-ink/8"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            <span className="font-mono text-[14px] font-semibold text-ink">
                              {money(r.product.price * r.qty)}
                            </span>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {!placed && rows.length > 0 && (
              <footer className="border-t border-ink/10 bg-surface px-5 py-4">
                <dl className="space-y-1.5 text-[14px]">
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-soft">Subtotal</dt>
                    <dd className="font-mono text-ink">{money(subtotal)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-soft">Delivery</dt>
                    <dd className={cx('font-mono', delivery ? 'text-ink' : 'text-pistachio-deep')}>
                      {delivery ? money(delivery) : 'Free'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-ink/10 pt-2.5">
                    <dt className="font-display text-[16px] font-semibold text-ink">Total</dt>
                    <dd className="font-display text-[20px] font-semibold text-berry">{money(subtotal + delivery)}</dd>
                  </div>
                </dl>

                {delivery > 0 && (
                  <p className="mt-2 text-[12px] text-ink-soft">
                    Add {money(40 - subtotal)} more for free delivery (E40 minimum).
                  </p>
                )}

                <Btn size="lg" className="mt-3.5 w-full flex items-center justify-center gap-2" onClick={handleWhatsAppCheckout}>
                  <MessageCircle size={18} />
                  Order via WhatsApp · {money(subtotal + delivery)}
                </Btn>
                <p className="mt-2.5 text-center text-[11.5px] text-ink-soft">
                  Your order will be sent to our WhatsApp for confirmation.
                </p>
              </footer>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
