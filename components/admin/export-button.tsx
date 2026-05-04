"use client";

import { useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCoachesCsv, exportClientsCsv } from "@/lib/actions/admin";

type Kind = "coaches" | "clients";

export function ExportCsvButton({ kind, label }: { kind: Kind; label?: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const fn = kind === "coaches" ? exportCoachesCsv : exportClientsCsv;
      const { filename, csv } = await fn();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Download className="size-3.5 mr-1.5" />}
      {label ?? "Export CSV"}
    </Button>
  );
}
