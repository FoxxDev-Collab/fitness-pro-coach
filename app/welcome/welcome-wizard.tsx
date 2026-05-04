"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Compass, ArrowRight, ArrowLeft, Check, Copy, Loader2, Globe, AlertCircle } from "lucide-react";
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
import { checkSlugAvailable, completeOnboarding } from "@/lib/actions/coach-profile";

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

type WizardProps = {
  initialName: string;
  initialBusinessName: string;
  initialSpecialty: string;
  initialBio: string;
  initialSlug: string;
  initialTimezone: string;
};

export function WelcomeWizard(props: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState(props.initialName);
  const [businessName, setBusinessName] = useState(props.initialBusinessName);
  const [specialty, setSpecialty] = useState(props.initialSpecialty);
  const [bio, setBio] = useState(props.initialBio);

  // Step 2
  const [timezone, setTimezone] = useState(props.initialTimezone);
  const [slug, setSlug] = useState(props.initialSlug);
  const [slugStatus, setSlugStatus] = useState<
    { state: "idle" } | { state: "checking" } | { state: "ok" } | { state: "error"; message: string }
  >({ state: "idle" });

  // Auto-detect timezone on mount if empty
  useEffect(() => {
    if (!timezone) {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (detected) setTimezone(detected);
      } catch {
        // ignore — user can type it
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate slug as user types (debounced)
  useEffect(() => {
    if (!slug) {
      setSlugStatus({ state: "idle" });
      return;
    }
    setSlugStatus({ state: "checking" });
    const timer = setTimeout(async () => {
      const result = await checkSlugAvailable(slug);
      if (result.available) {
        setSlugStatus({ state: "ok" });
      } else {
        setSlugStatus({ state: "error", message: result.reason ?? "Not available" });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

  const step1Valid = name.trim().length > 0 && specialty;
  const step2Valid = slug && timezone && slugStatus.state === "ok";

  function next() {
    setError(null);
    if (step === 1 && !step1Valid) {
      setError("Please fill in your name and specialty.");
      return;
    }
    if (step === 2 && !step2Valid) {
      setError("Please choose a valid intake URL and timezone.");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function finish() {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding({
        name: name.trim(),
        businessName: businessName.trim() || null,
        specialty: specialty || null,
        bio: bio.trim() || null,
        intakeSlug: slug,
        timezone,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.push("/");
    });
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b">
        <div className="max-w-2xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <span className="text-lg font-semibold tracking-tight">Praevio</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Step {step} of 3
          </span>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-10 sm:py-16">
        {error && (
          <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight mb-2">
                Welcome to Praevio
              </h1>
              <p className="text-muted-foreground">
                Tell us a bit about you. This is what your clients will see.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Your name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business name <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Smith Strength Co."
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if you train under your own name.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty <span className="text-destructive">*</span></Label>
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
                <Label htmlFor="bio">
                  Short bio <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
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
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight mb-2">
                Set up your practice
              </h1>
              <p className="text-muted-foreground">
                Your timezone keeps schedules accurate. Your intake URL is what you share with new clients.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone <span className="text-destructive">*</span></Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="America/Denver"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-detected from your browser. Edit if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  Your intake URL <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-stretch rounded-md border focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] overflow-hidden">
                  <span className="px-3 flex items-center bg-muted text-muted-foreground text-sm border-r font-mono">
                    praevio.fitness/intake/
                  </span>
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="flex-1 px-3 py-2 bg-transparent outline-none text-sm font-mono"
                    placeholder="jane-smith"
                    maxLength={40}
                  />
                  <span className="px-3 flex items-center text-sm shrink-0">
                    {slugStatus.state === "checking" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {slugStatus.state === "ok" && <Check className="size-4 text-success" />}
                    {slugStatus.state === "error" && <AlertCircle className="size-4 text-destructive" />}
                  </span>
                </div>
                {slugStatus.state === "error" ? (
                  <p className="text-xs text-destructive">{slugStatus.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This is the public link new clients use to send you their intake. You can change it later.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Check className="size-5 text-primary" strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight mb-2">
                  You&apos;re all set, {name.split(" ")[0] || "Coach"}
                </h1>
                <p className="text-muted-foreground">
                  Your Praevio workspace is ready. Here&apos;s your public intake link — share it with prospective clients.
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                <Globe className="size-3.5" />
                Your intake link
              </div>
              <SlugCopyRow slug={slug} />
              <p className="text-xs text-muted-foreground">
                Submissions land in your inbox. Convert any submission into a client with one click.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/40 p-5 space-y-3">
              <h3 className="font-medium text-sm">What&apos;s next</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2"><span className="text-primary">→</span> Add your first client manually, or wait for an intake submission</li>
                <li className="flex gap-2"><span className="text-primary">→</span> Build a program from the exercise library</li>
                <li className="flex gap-2"><span className="text-primary">→</span> Assign the program and start running sessions</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-10 pt-6 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={back}
            disabled={step === 1 || pending}
          >
            <ArrowLeft className="size-4 mr-1" /> Back
          </Button>

          {step < 3 ? (
            <Button type="button" onClick={next} disabled={pending}>
              Continue <ArrowRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={pending}>
              {pending ? (
                <><Loader2 className="size-4 mr-1 animate-spin" /> Finishing...</>
              ) : (
                <>Go to dashboard <ArrowRight className="size-4 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function SlugCopyRow({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `praevio.fitness/intake/${slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`https://${fullUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API can fail on insecure contexts — fail silently
    }
  }

  return (
    <div className="flex items-stretch rounded-md border bg-background overflow-hidden">
      <code className="flex-1 px-3 py-2 text-sm font-mono truncate">{fullUrl}</code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="rounded-none border-l h-auto px-3"
      >
        {copied ? (
          <><Check className="size-3.5 mr-1.5" /> Copied</>
        ) : (
          <><Copy className="size-3.5 mr-1.5" /> Copy</>
        )}
      </Button>
    </div>
  );
}
