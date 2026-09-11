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
          <p className="order-form-subtitle">Little Bliss Bakery — P.O. Box 2700, Matsapha — +268 621 0474</p>
        </div>
        <div className="order-form-date-box">
          <span className="order-form-date-label">Date</span>
          <div className="order-form-underline order-form-date-line" />
        </div>
      </header>

      <div className="order-form-grid">
        {slots.map((num) => (
          <div key={num} className="order-form-slot">
            <div className="order-form-slot-header">
              <span className="order-form-slot-number">#{num}</span>
              <div className="order-form-slot-date-area">
                <span className="order-form-label">Date</span>
                <div className="order-form-underline order-form-underline-short" />
              </div>
            </div>

            <div className="order-form-slot-body">
              {/* Customer name - full width */}
              <div className="order-form-field-group">
                <span className="order-form-label">Customer Name</span>
                <div className="order-form-underline" />
              </div>

              {/* Product lines - 3 rows */}
              <div className="order-form-products-block">
                <span className="order-form-label">Products / Items</span>
                <div className="order-form-products-grid">
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
                <div className="order-form-col-headers">
                  <span className="order-form-col-header">Item</span>
                  <span className="order-form-col-header">Qty</span>
                </div>
              </div>

              {/* Phone + tickbox row */}
              <div className="order-form-two-col">
                <div className="order-form-field-group order-form-col-wide">
                  <span className="order-form-label">Phone Number</span>
                  <div className="order-form-underline" />
                </div>
                <div className="order-form-tick-area">
                  <div className="order-form-checkbox" />
                  <span className="order-form-tick-label">Done</span>
                </div>
              </div>

              {/* Notes */}
              <div className="order-form-field-group">
                <span className="order-form-label">Notes</span>
                <div className="order-form-underline" />
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
