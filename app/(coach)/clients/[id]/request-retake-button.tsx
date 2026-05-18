"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import { requestIntakeRetake } from "@/lib/actions/intake";

export function RequestRetakeButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("This will permanently delete the client's current intake response. They'll be prompted to refill it on next login. Continue?")) return;
    setError(null);
    startTransition(async () => {
      const result = await requestIntakeRetake(clientId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <RotateCcw className="size-4 mr-1.5" />}
        Request re-take
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
