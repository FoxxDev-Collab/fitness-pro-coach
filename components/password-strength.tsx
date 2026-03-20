"use client";

import { passwordChecks } from "@/lib/password";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const passed = passwordChecks.filter((c) => c.test(password)).length;
  const total = passwordChecks.length;
  const strength = passed / total;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < passed
                ? strength === 1
                  ? "bg-success"
                  : strength >= 0.6
                  ? "bg-warning"
                  : "bg-destructive"
                : "bg-muted"
            )}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {passwordChecks.map((check) => {
          const pass = check.test(password);
          return (
            <li
              key={check.label}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                pass ? "text-success" : "text-muted-foreground"
              )}
            >
              {pass ? <Check className="size-3" /> : <X className="size-3" />}
              {check.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
