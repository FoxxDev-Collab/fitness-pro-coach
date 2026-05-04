"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Circle, X, ListChecks } from "lucide-react";
import { dismissSetupChecklist } from "@/lib/actions/coach-profile";

type Item = {
  done: boolean;
  label: string;
  hint: string;
  href: string;
  cta: string;
};

export function SetupChecklist({
  profileComplete,
  hasClient,
  hasProgram,
  hasAssignment,
  hasIntakeSlug,
  intakeSlug,
}: {
  profileComplete: boolean;
  hasClient: boolean;
  hasProgram: boolean;
  hasAssignment: boolean;
  hasIntakeSlug: boolean;
  intakeSlug: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  const items: Item[] = [
    {
      done: profileComplete,
      label: "Complete your coach profile",
      hint: "Business name, specialty, and timezone",
      href: "/settings",
      cta: "Edit profile",
    },
    {
      done: hasIntakeSlug,
      label: "Customize your intake link",
      hint: intakeSlug ? `praevio.fitness/intake/${intakeSlug}` : "Pick the public URL clients use to send you their intake",
      href: "/settings",
      cta: "Customize",
    },
    {
      done: hasClient,
      label: "Add your first client",
      hint: "Or wait for a submission from your intake link",
      href: "/clients",
      cta: "Add client",
    },
    {
      done: hasProgram,
      label: "Build your first program",
      hint: "Workouts, exercises, sets, reps, rest",
      href: "/programs/new",
      cta: "New program",
    },
    {
      done: hasAssignment,
      label: "Assign a program to a client",
      hint: "Then run a live session together",
      href: "/clients",
      cta: "Assign",
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = completedCount === total;

  function handleDismiss() {
    startTransition(async () => {
      setDismissed(true);
      await dismissSetupChecklist();
    });
  }

  if (dismissed) return null;

  return (
    <Card className="border-primary/30 bg-primary/[0.02]">
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="size-9 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
              <ListChecks className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold tracking-tight">Get started with Praevio</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allDone ? "All done — nice work" : `${completedCount} of ${total} complete`}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleDismiss}
            disabled={pending}
            aria-label="Dismiss checklist"
            className="shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(completedCount / total) * 100}%` }}
          />
        </div>

        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i}>
              <div className="flex items-start gap-3 py-1.5">
                <div className="mt-0.5 shrink-0">
                  {item.done ? (
                    <div className="size-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="size-3 text-primary-foreground" strokeWidth={3} />
                    </div>
                  ) : (
                    <Circle className="size-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      item.done ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{item.hint}</p>
                </div>
                {!item.done && (
                  <Button asChild variant="ghost" size="sm" className="shrink-0">
                    <Link href={item.href}>{item.cta}</Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
