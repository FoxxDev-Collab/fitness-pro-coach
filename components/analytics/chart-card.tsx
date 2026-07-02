"use client";

import { cn } from "@/lib/utils";

export type ChartCardProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

/** Consistent framing for any chart or data block in the analytics system. */
export function ChartCard({
  title,
  subtitle,
  actions,
  className,
  bodyClassName,
  children,
}: ChartCardProps) {
  return (
    <div className={cn("flex flex-col rounded-sm border bg-card", className)}>
      <div className="flex items-start justify-between gap-2 border-b px-3.5 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      <div className={cn("p-3.5", bodyClassName)}>{children}</div>
    </div>
  );
}
