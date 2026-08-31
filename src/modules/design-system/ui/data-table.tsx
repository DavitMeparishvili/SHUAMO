import type { ReactNode } from "react";

export interface DataTableColumn<Row extends Record<string, ReactNode>> {
  key: keyof Row;
  label: string;
  align?: "left" | "right";
}

export function DataTable<Row extends Record<string, ReactNode>>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  caption: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: keyof Row;
}) {
  return (
    <div
      className="max-w-full overflow-x-auto rounded-sm"
      aria-label={caption}
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-[640px] border-collapse text-left type-small">
        <caption className="pb-3 text-left type-small font-semibold text-ink">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-slate-300 text-slate-600">
            {columns.map((column) => (
              <th
                className={`px-3 py-3 font-semibold ${column.align === "right" ? "text-right" : "text-left"}`}
                key={String(column.key)}
                scope="col"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className="border-b border-slate-200 last:border-b-0"
              key={String(row[rowKey])}
            >
              {columns.map((column) => (
                <td
                  className={`px-3 py-4 ${column.align === "right" ? "text-right tabular-nums" : "text-left"}`}
                  key={String(column.key)}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
