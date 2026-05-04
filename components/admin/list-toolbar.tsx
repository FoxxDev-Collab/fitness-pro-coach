"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ListToolbar({
  placeholder = "Search...",
  filters,
}: {
  placeholder?: string;
  filters?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const initial = useRef(true);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q) next.set("q", q);
      else next.delete("q");
      next.delete("page"); // reset pagination on new query
      router.replace(`${pathname}?${next.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="pl-8 pr-8"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {filters && <div className="flex items-center gap-2">{filters}</div>}
    </div>
  );
}

export function FilterSelect({
  paramKey,
  options,
  defaultLabel,
}: {
  paramKey: string;
  options: { value: string; label: string }[];
  defaultLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(paramKey) ?? "";

  function update(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(paramKey, value);
    else next.delete(paramKey);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => update(e.target.value)}
      className="h-9 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <option value="">{defaultLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  function go(p: number) {
    const next = new URLSearchParams(params.toString());
    if (p === 1) next.delete("page");
    else next.set("page", String(p));
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground tabular-nums">
        {total === 0 ? "0 results" : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="px-2.5 py-1 rounded-md border hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Prev
        </button>
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="px-2.5 py-1 rounded-md border hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next
        </button>
      </div>
    </div>
  );
}
