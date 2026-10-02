import type { ReactNode } from 'react';

import type { Settings } from '@/lib/store';

/**
 * The printable report. This is what "Export PDF" produces: a purpose-built A4
 * document, not a capture of the screen. It carries the bakery's identity, the
 * report title, the reporting period, the moment it was generated, the headline
 * figures, the tables with their totals, the charts the reader needs, and the
 * caveats that make the numbers honest — all laid out for paper.
 *
 * Nothing here computes a figure. Every value arrives pre-computed from the
 * helpers in @/lib/store, so the printed document cannot drift from the screen.
 */
export type ReportKpi = { label: string; value: string; note?: string };

export type ReportSection = {
  heading: string;
  note?: string;
  /** Rendered above the table. Pass fixed-width charts for a predictable print. */
  chart?: ReactNode;
  columns?: string[];
  /** Cells are strings or numbers; the first column is treated as the row label. */
  rows: (string | number)[][];
  /** Column alignment. Defaults to left for the first column, right for the rest. */
  align?: ('left' | 'right')[];
  /** A totals row pinned under the table. */
  totals?: (string | number)[];
  emptyText?: string;
};

export type ReportDocumentProps = {
  settings: Settings;
  title: string;
  subtitle?: string;
  period: string;
  generatedAt?: string;
  kpis?: ReportKpi[];
  sections: ReportSection[];
  notes?: string[];
};

export function ReportDocument({ settings, title, subtitle, period, generatedAt, kpis = [], sections, notes = [] }: ReportDocumentProps) {
  const generated = generatedAt ? new Date(generatedAt) : new Date();
  const generatedLabel = `${generated.toLocaleDateString('en-SZ', { day: '2-digit', month: '2-digit', year: 'numeric' })} at ${generated.toLocaleTimeString('en-SZ', { hour: '2-digit', minute: '2-digit' })}`;
  const withRows = sections.filter(section => section.rows.length > 0 || section.chart);

  return (
    <article className="report-doc-paper" aria-label={`${title} report`}>
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
          <div><span>Reporting period</span><strong>{period}</strong></div>
          <div><span>Generated</span><strong>{generatedLabel}</strong></div>
        </div>
      </header>

      <h1 className="report-doc-title">{title}</h1>
      {subtitle && <p className="report-doc-subtitle">{subtitle}</p>}

      {kpis.length > 0 && (
        <section className="report-doc-kpis">
          {kpis.map(kpi => (
            <div key={kpi.label} className="report-doc-kpi">
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              {kpi.note && <em>{kpi.note}</em>}
            </div>
          ))}
        </section>
      )}

      {withRows.length === 0 && (
        <p className="report-doc-empty">No data available for this period.</p>
      )}

      {withRows.map(section => (
        <section key={section.heading} className="report-doc-section">
          <h2>{section.heading}</h2>
          {section.note && <p className="report-doc-note">{section.note}</p>}
          {section.chart && <div className="report-doc-chart">{section.chart}</div>}
          {section.rows.length > 0 && section.columns && (
            <table className="report-doc-table">
              <thead>
                <tr>
                  {section.columns.map((column, index) => (
                    <th key={column} style={{ textAlign: section.align?.[index] || (index === 0 ? 'left' : 'right') }}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} style={{ textAlign: section.align?.[cellIndex] || (cellIndex === 0 ? 'left' : 'right') }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {section.totals && (
                <tfoot>
                  <tr>
                    {section.totals.map((cell, cellIndex) => (
                      <td key={cellIndex} style={{ textAlign: section.align?.[cellIndex] || (cellIndex === 0 ? 'left' : 'right') }}>{cell}</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </section>
      ))}

      {notes.length > 0 && (
        <section className="report-doc-notes">
          <h2>Notes</h2>
          <ul>{notes.map(note => <li key={note}>{note}</li>)}</ul>
        </section>
      )}

      <footer className="report-doc-footer">
        <span>{settings.bakeryName || 'Little Bliss Bakery'}</span>
        <span>{title} · {period}</span>
        <span>Prepared {generatedLabel}</span>
      </footer>
    </article>
  );
}
