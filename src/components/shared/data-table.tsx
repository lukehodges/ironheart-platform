"use client"

import React from "react"

export interface DataTableColumn {
  key: string
  label: string
  mono?: boolean
  width?: number | string
}

export interface DataTableProps<T> {
  columns: DataTableColumn[]
  rows: T[]
  renderRow: (row: T, index: number) => React.ReactNode
  onRowClick?: (row: T) => void
  selectedId?: string
  emptyState?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

const TH_STYLE: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 10px",
  fontWeight: 500,
  fontSize: 10,
  color: "var(--ih-ink-40)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontFamily: "var(--ih-font-mono)",
}

export function DataTable<T>({
  columns,
  rows,
  renderRow,
  emptyState,
  header,
  footer,
}: DataTableProps<T>) {
  return (
    <div className="ih-card">
      {header && (
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--ih-line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {header}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--ih-surface-2)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...TH_STYLE,
                    width: col.width,
                    fontFamily: col.mono ? "var(--ih-font-mono)" : TH_STYLE.fontFamily,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && emptyState ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 32, textAlign: "center" }}>
                  {emptyState}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <React.Fragment key={i}>{renderRow(row, i)}</React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer && (
        <div
          style={{
            padding: "8px 18px",
            borderTop: "1px solid var(--ih-line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "var(--ih-ink-50)",
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
