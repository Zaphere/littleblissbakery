import type { Ingredient, PurchaseOrder, Settings } from '@/lib/store';

/**
 * A purchase order on paper. The manager can read what to buy, how much, from
 * whom, what it should cost and whether it is still pending — then tick it off
 * on the shop floor or send it to a supplier. Values come from the store; this
 * component only lays them out.
 */
export type PurchaseOrderDocumentProps = {
  settings: Settings;
  orders: PurchaseOrder[];
  ingredients?: Ingredient[];
  reference?: string;
  date?: string;
  status?: string;
  notes?: string;
};

const money = (value: number) => `E${(Number(value) || 0).toLocaleString('en-SZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qty = (value: number) => (Number(value) || 0).toLocaleString('en-SZ', { maximumFractionDigits: 2 });

export function PurchaseOrderDocument({ settings, orders, ingredients = [], reference, date, status, notes }: PurchaseOrderDocumentProps) {
  const rows = orders.map(order => {
    const packSize = ingredients.find(i => i.id === order.ingredientId)?.packSize;
    return {
      ...order,
      packSize,
      packs: packSize && packSize > 0 ? (order.quantity || 0) / packSize : null,
    };
  });
  const total = rows.reduce((sum, row) => sum + (row.estimatedCost || 0), 0);
  const issuedOn = date || (orders.length ? orders.map(order => order.orderDate).sort().slice(-1)[0] : '');
  const isList = !reference;

  return (
    <article className="report-doc-paper" aria-label="Purchase order">
      <header className="report-doc-header">
        <div className="report-doc-brand">
          <img src="/little-bliss-logo.jpg" alt="" className="report-doc-logo" />
          <div>
            <strong>{settings.bakeryName || 'Little Bliss Bakery'}</strong>
            {settings.address && <span>{settings.address}</span>}
            {settings.phone && <span>{settings.phone}</span>}
          </div>
        </div>
        <div className="report-doc-meta">
          <div><span>{isList ? 'Document' : 'Purchase order'}</span><strong>{reference || 'Reorder list'}</strong></div>
          <div><span>Date</span><strong>{issuedOn ? new Date(`${issuedOn}T00:00:00`).toLocaleDateString('en-SZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</strong></div>
          {status && <div><span>Status</span><strong>{status}</strong></div>}
        </div>
      </header>

      <h1 className="report-doc-title">Purchase Order</h1>
      <p className="report-doc-subtitle">
        A record of the ingredients and supplies the bakery needs to purchase. Reviewed by the manager before ordering and used as a purchasing checklist.
      </p>

      <section className="report-doc-kpis">
        <div className="report-doc-kpi"><span>Line items</span><strong>{rows.length}</strong></div>
        <div className="report-doc-kpi"><span>Suppliers</span><strong>{new Set(rows.map(row => row.supplier).filter(Boolean)).size}</strong></div>
        <div className="report-doc-kpi"><span>Estimated total</span><strong>{money(total)}</strong></div>
        <div className="report-doc-kpi"><span>Still pending</span><strong>{rows.filter(row => row.status === 'pending').length}</strong></div>
      </section>

      <section className="report-doc-section">
        <h2>Items to purchase</h2>
        <table className="report-doc-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>✓</th>
              <th style={{ textAlign: 'left' }}>Item</th>
              <th style={{ textAlign: 'left' }}>Supplier</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Packs</th>
              <th>Est. cost</th>
              <th style={{ textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'left' }}>No purchase orders to show.</td></tr>
            )}
            {rows.map(row => (
              <tr key={row.id}>
                <td style={{ textAlign: 'left' }}>&#9744;</td>
                <td style={{ textAlign: 'left' }}>{row.ingredientName}</td>
                <td style={{ textAlign: 'left' }}>{row.supplier || '—'}</td>
                <td>{qty(row.quantity)}</td>
                <td>{row.unit || '—'}</td>
                <td>{row.packs === null ? '—' : qty(row.packs)}</td>
                <td>{money(row.estimatedCost)}</td>
                <td style={{ textAlign: 'left' }}>{row.status}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td style={{ textAlign: 'left' }} colSpan={6}>Estimated total</td>
                <td>{money(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      {notes && (
        <section className="report-doc-notes">
          <h2>Notes</h2>
          <ul><li>{notes}</li></ul>
        </section>
      )}

      <section className="report-doc-signoff">
        <div><span>Ordered by</span><div className="report-doc-rule" /></div>
        <div><span>Approved by</span><div className="report-doc-rule" /></div>
        <div><span>Date received</span><div className="report-doc-rule" /></div>
      </section>

      <footer className="report-doc-footer">
        <span>{settings.bakeryName || 'Little Bliss Bakery'}</span>
        <span>{isList ? 'Purchase order list' : reference}</span>
        <span>Estimated cost uses the recorded purchase price per pack.</span>
      </footer>
    </article>
  );
}
