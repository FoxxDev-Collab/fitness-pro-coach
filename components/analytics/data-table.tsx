"use client";

import { cn } from "@/lib/utils";

export type DataColumn = {
  header: string;
  align?: "left" | "right" | "center";
  className?: string;
};

/**
 * Dense, borderless-ish data table. Callers build the cells (ReactNodes) so it
 * stays presentational — numbers should use `font-mono tabular-nums`.
 */
export function DataTable({
  columns,
  rows,
  empty = "No data",
  maxHeight,
}: {
  columns: DataColumn[];
  rows: React.ReactNode[][];
  empty?: string;
  maxHeight?: number;
}) {
  const alignClass = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div
      className={cn("overflow-auto", maxHeight && "rounded-sm border")}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b">
            {columns.map((c, i) => (
              <th
                key={i}
                className={cn(
                  "px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
                  alignClass(c.align),
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className="border-b last:border-0 transition-colors hover:bg-muted/40">
              {cells.map((cell, c) => (
                <td
                  key={c}
                  className={cn("px-3 py-1.5", alignClass(columns[c]?.align), columns[c]?.className)}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
