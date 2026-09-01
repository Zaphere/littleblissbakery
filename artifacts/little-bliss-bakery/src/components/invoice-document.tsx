import type { Order, Product, Settings } from '@/lib/store';

type InvoiceDocumentProps = {
  order: Order;
  products: Product[];
  settings: Settings;
};

const invoiceMoney = (value: number) =>
  `E${value.toLocaleString('en-SZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const invoiceDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-SZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export function InvoiceDocument({ order, products, settings }: InvoiceDocumentProps) {
  const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxable = subtotal - order.discount + order.deliveryFee;
  const tax = taxable * ((order.taxRate || 0) / 100);
  const total = taxable + tax;
  const productName = (productId: string) =>
    products.find((product) => product.id === productId)?.name || 'Product';

  return (
    <article className="printable-invoice invoice-paper" aria-label={`${order.invoiceNumber} invoice`}>
      <header className="invoice-header">
        <div className="invoice-logo">
          <img src="/little-bliss-logo.jpg" alt="Little Bliss Bakery" className="h-16 w-auto object-contain" />
        </div>
        <div className="invoice-company">
          <strong>{settings.bakeryName || 'Little Bliss Bakery'}</strong>
          <span>{settings.address || 'P.O. Box 2700'}</span>
          <span>Matsapha, Eswatini</span>
          <span>Cell: {settings.phone || '+268 621 0474'}</span>
          <span>{settings.email || 'morrelloblue@gmail.com'}</span>
        </div>
        <div className="invoice-meta">
          <div className="invoice-meta-row">
            <span>Invoice No.</span>
            <strong>{order.invoiceNumber}</strong>
          </div>
          <div className="invoice-title">Invoice</div>
        </div>
      </header>

      <section className="invoice-customer-grid">
        <div className="invoice-customer">
          <h2>Customer</h2>
          <dl>
            <div><dt>Name</dt><dd>{order.customerName || '—'}</dd></div>
            <div><dt>Address</dt><dd>{order.customerAddress || '—'}</dd></div>
            <div><dt>City</dt><dd>{order.customerCity || '—'}</dd></div>
            <div><dt>Phone</dt><dd>{order.phone || '—'}</dd></div>
          </dl>
        </div>
        <div className="invoice-misc">
          <h2>Misc</h2>
          <dl>
            <div><dt>Date</dt><dd>{invoiceDate(order.orderDate)}</dd></div>
            <div><dt>Order No.</dt><dd>{order.orderNumber || '—'}</dd></div>
            <div><dt>Code</dt><dd>{order.code || '—'}</dd></div>
            <div><dt>Rep</dt><dd>{order.salesRep || '—'}</dd></div>
            <div><dt>FOB</dt><dd>{order.fob || '—'}</dd></div>
          </dl>
        </div>
      </section>

      <table className="invoice-items">
        <thead>
          <tr>
            <th>Qty</th>
            <th>Description</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={`${item.productId}-${index}`}>
              <td>{item.quantity}</td>
              <td>{productName(item.productId)}</td>
              <td>{invoiceMoney(item.unitPrice)}</td>
              <td>{invoiceMoney(item.quantity * item.unitPrice)}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 5 - order.items.length) }).map((_, index) => (
            <tr key={`blank-${index}`} className="invoice-blank-row">
              <td />
              <td />
              <td />
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      <section className="invoice-bottom-grid">
        <div className="invoice-payment">
          <h2>Payment</h2>
          <p>Bank: First National Bank</p>
          <p>Branch Name: Matsapha</p>
          <p>Branch Code: 281064</p>
          <p>Account Type: Cheque</p>
          <p>Account No.: 62871478006</p>
          <p>Account Name: Dominique Richter</p>
          {order.amountPaid > 0 && <p className="invoice-paid">Amount received: {invoiceMoney(order.amountPaid)}</p>}
        </div>
        <div className="invoice-totals">
          <div><span>SubTotal</span><strong>{invoiceMoney(subtotal)}</strong></div>
          {order.discount > 0 && <div><span>Discount</span><strong>-{invoiceMoney(order.discount)}</strong></div>}
          {order.deliveryFee > 0 && <div><span>Delivery</span><strong>{invoiceMoney(order.deliveryFee)}</strong></div>}
          <div><span>Tax Rate(s)</span><strong>{order.taxRate || 0}%</strong></div>
          <div className="invoice-total"><span>TOTAL</span><strong>{invoiceMoney(total)}</strong></div>
        </div>
      </section>

      <footer className="invoice-footer">
        <span>It has been a pleasure working with you.</span>
        <span>Pg 1</span>
      </footer>
    </article>
  );
}