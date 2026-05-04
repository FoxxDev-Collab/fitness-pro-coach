"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, AlertCircle, Copy, Globe } from "lucide-react";
import { checkSlugAvailable, updateCoachProfile } from "@/lib/actions/coach-profile";

const SPECIALTIES = [
  "Strength & Conditioning",
  "Powerlifting / Olympic lifting",
  "Bodybuilding / Hypertrophy",
  "General fitness / Wellness",
  "Postpartum / Pre-natal",
  "Post-rehab / Corrective",
  "Athletic performance",
  "Endurance / Running",
  "Other",
];

const MAX_BIO = 240;

export function CoachProfileSection(props: {
  businessName: string;
  specialty: string;
  bio: string;
  intakeSlug: string;
  timezone: string;
}) {
  const [businessName, setBusinessName] = useState(props.businessName);
  const [specialty, setSpecialty] = useState(props.specialty);
  const [bio, setBio] = useState(props.bio);
  const [slug, setSlug] = useState(props.intakeSlug);
  const [timezone, setTimezone] = useState(props.timezone);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [slugStatus, setSlugStatus] = useState<
    { state: "idle" } | { state: "checking" } | { state: "ok" } | { state: "error"; message: string }
  >({ state: "idle" });
  const [copied, setCopied] = useState(false);

  const slugDirty = !!slug && slug !== props.intakeSlug;
  const displaySlugStatus = slugDirty ? slugStatus : ({ state: "idle" } as const);

  useEffect(() => {
    if (!slugDirty) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      setSlugStatus({ state: "checking" });
      const r = await checkSlugAvailable(slug);
      if (cancelled) return;
      setSlugStatus(
        r.available ? { state: "ok" } : { state: "error", message: r.reason ?? "Not available" },
      );
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [slug, slugDirty]);

  function handleSave() {
    setMsg(null);
    if (displaySlugStatus.state === "error") {
      setMsg({ type: "error", text: displaySlugStatus.message });
      return;
    }
    startTransition(async () => {
      const res = await updateCoachProfile({
        businessName: businessName.trim() || null,
        specialty: specialty || null,
        bio: bio.trim() || null,
        intakeSlug: slug || null,
        timezone: timezone.trim() || null,
      });
      if ("error" in res && res.error) {
        setMsg({ type: "error", text: res.error });
      } else {
        setMsg({ type: "success", text: "Coach profile saved" });
      }
    });
  }

  async function handleCopy() {
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(`https://praevio.fitness/intake/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Coach profile</CardTitle>
        <CardDescription>How your business shows up to clients</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {msg && (
          <div
            className={`rounded-md border p-3 text-sm ${
              msg.type === "error"
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-success/50 bg-success/10 text-success"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Smith Strength Co."
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialty">Specialty</Label>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger id="specialty">
              <SelectValue placeholder="Select your focus area..." />
            </SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Short bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
            placeholder="Two sentences about how you work with clients..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {bio.length} / {MAX_BIO}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="America/Denver"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Intake URL</Label>
          <div className="flex items-stretch rounded-md border focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] overflow-hidden">
            <span className="px-3 flex items-center bg-muted text-muted-foreground text-sm border-r font-mono">
              praevio.fitness/intake/
            </span>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              className="flex-1 px-3 py-2 bg-transparent outline-none text-sm font-mono"
              placeholder="jane-smith"
              maxLength={40}
            />
            <span className="px-3 flex items-center text-sm shrink-0">
              {displaySlugStatus.state === "checking" && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              {displaySlugStatus.state === "ok" && <Check className="size-4 text-success" />}
              {displaySlugStatus.state === "error" && (
                <AlertCircle className="size-4 text-destructive" />
              )}
            </span>
          </div>
          {displaySlugStatus.state === "error" && (
            <p className="text-xs text-destructive">{displaySlugStatus.message}</p>
          )}
          {slug && displaySlugStatus.state !== "error" && (
            <div className="flex items-center justify-between gap-2 mt-2 rounded-md border bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="size-3.5 text-muted-foreground shrink-0" />
                <code className="text-xs font-mono truncate">
                  praevio.fitness/intake/{slug}
                </code>
              </div>
              <Button type="button" variant="ghost" size="xs" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="size-3 mr-1" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3 mr-1" /> Copy
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={pending || displaySlugStatus.state === "checking"}>
          {pending ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
