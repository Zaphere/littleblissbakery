type KitchenOrderFormDocumentProps = {
  numberOfSlots?: number;
};

export function KitchenOrderFormDocument({ numberOfSlots = 4 }: KitchenOrderFormDocumentProps) {
  const slots = Array.from({ length: numberOfSlots }, (_, i) => i + 1);

  return (
    <article className="printable-report order-form-paper" aria-label="Kitchen Order Form">
      <header className="order-form-header">
        <div className="order-form-logo">
          <img src="/little-bliss-logo.jpg" alt="Little Bliss Bakery" className="h-14 w-auto object-contain" />
        </div>
        <div className="order-form-title-block">
          <h1 className="order-form-title">Kitchen Order Form</h1>
          <p className="order-form-subtitle">Little Bliss Bakery &mdash; P.O. Box 2700, Matsapha &mdash; +268 621 0474</p>
        </div>
        <div className="order-form-date-box">
          <span className="order-form-date-label">Date</span>
          <div className="order-form-underline order-form-date-line" />
        </div>
      </header>

      <div className="order-form-strips">
        {slots.map((num, idx) => (
          <div key={num} className={`order-form-strip ${idx === 0 ? 'order-form-strip--first' : ''}`}>
            <div className="order-form-strip-top">
              <span className="order-form-strip-number">#{num}</span>
              <div className="order-form-strip-date-area">
                <span className="order-form-label">Date</span>
                <div className="order-form-underline order-form-underline-short" />
              </div>
            </div>

            <div className="order-form-strip-body">
              <div className="order-form-strip-col order-form-strip-col-left">
                <div className="order-form-field-group">
                  <span className="order-form-label">Customer Name</span>
                  <div className="order-form-underline" />
                </div>
                <div className="order-form-field-group">
                  <span className="order-form-label">Phone Number</span>
                  <div className="order-form-underline" />
                </div>
              </div>

              <div className="order-form-strip-col order-form-strip-col-middle">
                <div className="order-form-col-headers">
                  <span className="order-form-col-header order-form-col-header-item">Item</span>
                  <span className="order-form-col-header order-form-col-header-qty">Qty</span>
                </div>
                {[1, 2, 3].map((row) => (
                  <div key={row} className="order-form-product-row">
                    <div className="order-form-field-group order-form-col-wide">
                      <div className="order-form-underline" />
                    </div>
                    <div className="order-form-field-group order-form-col-narrow">
                      <div className="order-form-underline" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-form-strip-col order-form-strip-col-right">
                <div className="order-form-field-group">
                  <span className="order-form-label">Notes</span>
                  <div className="order-form-underline" />
                </div>
                <div className="order-form-tick-area">
                  <div className="order-form-checkbox" />
                  <span className="order-form-tick-label">Done</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="order-form-footer">
        <span>Little Bliss Bakery — Kitchen Orders</span>
        <span>Printed {new Date().toLocaleDateString('en-SZ', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </footer>
    </article>
  );
}
