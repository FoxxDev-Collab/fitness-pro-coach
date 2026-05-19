"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { submitIntake } from "@/lib/actions/intake";

type QuestionType = "SHORT_TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTI_CHOICE";
type Question = { id: string; text: string; type: QuestionType; options: string[]; required: boolean };

const MEDICAL_CONDITIONS = [
  "Hypertension", "Type 1 diabetes", "Type 2 diabetes", "Heart disease",
  "Asthma / COPD", "Osteoporosis", "Arthritis", "Thyroid disorder",
  "PCOS", "Anxiety / depression", "Autoimmune disorder", "Cancer history",
  "Diastasis recti", "Herniated disc", "None of the above",
];

const PAIN_AREAS = [
  "Neck / cervical", "Shoulder (left)", "Shoulder (right)", "Upper back",
  "Lower back / lumbar", "Hip (left)", "Hip (right)", "Knee (left)",
  "Knee (right)", "Ankle / foot", "Elbow", "Wrist", "Other",
];

const PREGNANCY_OPTIONS = ["No", "Currently pregnant", "Postpartum <12mo", "N/A"];
const SIDE_OPTIONS = ["Left", "Right", "Both", "N/A"] as const;

type Injury = { description: string; year: string; side: typeof SIDE_OPTIONS[number]; active: boolean };

export function IntakeForm({
  coachName,
  waiverText,
  questions,
}: {
  coachName: string;
  waiverText: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Personal
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [occupation, setOccupation] = useState("");

  // Medical
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionsOther, setConditionsOther] = useState("");
  const [meds, setMeds] = useState<"No" | "Yes" | "">("");
  const [medsList, setMedsList] = useState("");
  const [pregnancy, setPregnancy] = useState("");
  const [hasRestriction, setHasRestriction] = useState<"No" | "Yes" | "">("");
  const [restrictionDetail, setRestrictionDetail] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [physicianPhone, setPhysicianPhone] = useState("");

  const [hasSurgery, setHasSurgery] = useState<"No" | "Yes" | "">("");
  const [injuries, setInjuries] = useState<Injury[]>([]);

  const [hasChronicPain, setHasChronicPain] = useState<"No" | "Yes" | "">("");
  const [painDetail, setPainDetail] = useState("");
  const [painAreas, setPainAreas] = useState<string[]>([]);

  // Custom answers
  const [customAnswers, setCustomAnswers] = useState<Record<string, { textValue: string; choiceValues: string[] }>>(
    Object.fromEntries(questions.map((q) => [q.id, { textValue: "", choiceValues: [] }])),
  );

  // Signature
  const [agreeWaiver, setAgreeWaiver] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  function toggle(list: string[], v: string, set: (s: string[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function setCustomText(id: string, value: string) {
    setCustomAnswers({ ...customAnswers, [id]: { ...customAnswers[id], textValue: value } });
  }
  function setCustomChoice(id: string, value: string, multi: boolean) {
    const current = customAnswers[id].choiceValues;
    const next = multi
      ? (current.includes(value) ? current.filter((x) => x !== value) : [...current, value])
      : [value];
    setCustomAnswers({ ...customAnswers, [id]: { ...customAnswers[id], choiceValues: next } });
  }

  function handleSubmit() {
    setError(null);

    if (!agreeWaiver) {
      setError("Please agree to the waiver to continue.");
      return;
    }
    if (signatureName.trim().length < 2) {
      setError("Please type your full legal name.");
      return;
    }

    const payload = {
      dateOfBirth: dateOfBirth || undefined,
      sex: sex || null,
      heightInches: heightInches ? Number(heightInches) : null,
      weightLbs: weightLbs ? Number(weightLbs) : null,
      occupation: occupation || null,
      medicalConditions: conditions,
      conditionsOther: conditionsOther || null,
      medications: meds === "Yes" ? medsList : null,
      pregnancyStatus: pregnancy || null,
      physicianRestrictions: hasRestriction === "Yes" ? restrictionDetail : null,
      physicianName: physicianName || null,
      physicianPhone: physicianPhone || null,
      injuries: hasSurgery === "Yes"
        ? injuries.map((i) => ({
            description: i.description,
            year: Number(i.year),
            side: i.side,
            active: i.active,
          }))
        : [],
      chronicPain: hasChronicPain === "Yes" ? painDetail : null,
      painAreas: hasChronicPain === "Yes" ? painAreas : [],
      customAnswers: Object.entries(customAnswers).map(([questionId, a]) => ({
        questionId,
        textValue: a.textValue || undefined,
        choiceValues: a.choiceValues,
      })),
      agreeWaiver: true as const,
      signatureName: signatureName.trim(),
    };

    startTransition(async () => {
      const result = await submitIntake(payload as unknown as Parameters<typeof submitIntake>[0]);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome — let&apos;s get you set up</h1>
        <p className="text-sm text-muted-foreground">
          {coachName} needs a few details before your first workout. This takes about 5 minutes.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Section title="Personal">
        <Grid2>
          <Field label="Date of birth">
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </Field>
          <Field label="Sex assigned at birth">
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">Prefer not to say</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Height (inches)">
            <Input type="number" min="12" max="120" value={heightInches} onChange={(e) => setHeightInches(e.target.value)} />
          </Field>
          <Field label="Weight (lbs)">
            <Input type="number" min="30" max="1500" step="0.1" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)} />
          </Field>
          <Field label="Occupation">
            <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g., nurse, office worker" />
          </Field>
        </Grid2>
      </Section>

      <Section title="Medical history">
        <Field label="Current or past medical conditions (select all that apply)">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {MEDICAL_CONDITIONS.map((c) => (
              <CheckOption key={c} checked={conditions.includes(c)} onChange={() => toggle(conditions, c, setConditions)}>{c}</CheckOption>
            ))}
          </div>
        </Field>
        <Field label="Other conditions not listed above">
          <Input value={conditionsOther} onChange={(e) => setConditionsOther(e.target.value)} placeholder="Describe if applicable" maxLength={500} />
        </Field>
      </Section>

      <Section title="Medications">
        <Field label="Are you currently taking medications that may affect exercise?">
          <RadioRow options={["No", "Yes"]} value={meds} onChange={(v) => setMeds(v as "No" | "Yes")} />
          {meds === "Yes" && (
            <Textarea
              className="mt-3"
              value={medsList}
              onChange={(e) => setMedsList(e.target.value)}
              placeholder="Medication name, dosage..."
              maxLength={2000}
            />
          )}
        </Field>
      </Section>

      <Section title="Pregnancy / postpartum">
        <RadioRow options={PREGNANCY_OPTIONS} value={pregnancy} onChange={setPregnancy} />
      </Section>

      <Section title="Physician restrictions">
        <Field label="Has your doctor placed any exercise restrictions?">
          <RadioRow options={["No", "Yes"]} value={hasRestriction} onChange={(v) => setHasRestriction(v as "No" | "Yes")} />
          {hasRestriction === "Yes" && (
            <Textarea
              className="mt-3"
              value={restrictionDetail}
              onChange={(e) => setRestrictionDetail(e.target.value)}
              placeholder="Describe any restrictions..."
              maxLength={2000}
            />
          )}
        </Field>
        <Grid2>
          <Field label="Physician / provider name">
            <Input value={physicianName} onChange={(e) => setPhysicianName(e.target.value)} />
          </Field>
          <Field label="Provider phone / clinic">
            <Input value={physicianPhone} onChange={(e) => setPhysicianPhone(e.target.value)} placeholder="(555) 000-0000" />
          </Field>
        </Grid2>
      </Section>

      <Section title="Surgeries / injuries">
        <Field label="Do you have any significant surgeries or injuries to disclose?">
          <RadioRow options={["No", "Yes"]} value={hasSurgery} onChange={(v) => setHasSurgery(v as "No" | "Yes")} />
        </Field>
        {hasSurgery === "Yes" && (
          <div className="space-y-3 rounded-md border p-3">
            {injuries.map((inj, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_80px_100px_100px_32px] sm:items-end">
                <Field label="Description">
                  <Input
                    value={inj.description}
                    onChange={(e) => setInjuries(injuries.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                    placeholder="e.g., ACL reconstruction"
                    maxLength={200}
                  />
                </Field>
                <Field label="Year">
                  <Input type="number" min="1900" max={new Date().getFullYear() + 1} value={inj.year} onChange={(e) => setInjuries(injuries.map((x, j) => j === i ? { ...x, year: e.target.value } : x))} />
                </Field>
                <Field label="Side">
                  <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={inj.side} onChange={(e) => setInjuries(injuries.map((x, j) => j === i ? { ...x, side: e.target.value as Injury["side"] } : x))}>
                    {SIDE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Active?">
                  <CheckOption
                    checked={inj.active}
                    onChange={() => setInjuries(injuries.map((x, j) => j === i ? { ...x, active: !x.active } : x))}
                  >Yes</CheckOption>
                </Field>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setInjuries(injuries.filter((_, j) => j !== i))} aria-label="Remove row">
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInjuries([...injuries, { description: "", year: String(new Date().getFullYear()), side: "N/A", active: false }])}
            >
              <Plus className="size-4 mr-1.5" /> Add injury / surgery
            </Button>
          </div>
        )}
      </Section>

      <Section title="Chronic pain">
        <Field label="Do you experience any chronic pain?">
          <RadioRow options={["No", "Yes"]} value={hasChronicPain} onChange={(v) => setHasChronicPain(v as "No" | "Yes")} />
        </Field>
        {hasChronicPain === "Yes" && (
          <>
            <Field label="Areas of pain, discomfort, or restriction (select all that apply)">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PAIN_AREAS.map((a) => (
                  <CheckOption key={a} checked={painAreas.includes(a)} onChange={() => toggle(painAreas, a, setPainAreas)}>{a}</CheckOption>
                ))}
              </div>
            </Field>
            <Field label="Describe location, severity (1-10), duration">
              <Textarea value={painDetail} onChange={(e) => setPainDetail(e.target.value)} maxLength={2000} />
            </Field>
          </>
        )}
      </Section>

      {questions.length > 0 && (
        <Section title={`${coachName}'s questions`}>
          {questions.map((q) => (
            <Field key={q.id} label={q.required ? `${q.text} *` : q.text}>
              {q.type === "SHORT_TEXT" && (
                <Input
                  value={customAnswers[q.id].textValue}
                  onChange={(e) => setCustomText(q.id, e.target.value)}
                  maxLength={500}
                />
              )}
              {q.type === "LONG_TEXT" && (
                <Textarea
                  value={customAnswers[q.id].textValue}
                  onChange={(e) => setCustomText(q.id, e.target.value)}
                  maxLength={5000}
                  rows={4}
                />
              )}
              {q.type === "SINGLE_CHOICE" && (
                <RadioRow
                  options={q.options}
                  value={customAnswers[q.id].choiceValues[0] ?? ""}
                  onChange={(v) => setCustomChoice(q.id, v, false)}
                />
              )}
              {q.type === "MULTI_CHOICE" && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {q.options.map((opt) => (
                    <CheckOption
                      key={opt}
                      checked={customAnswers[q.id].choiceValues.includes(opt)}
                      onChange={() => setCustomChoice(q.id, opt, true)}
                    >
                      {opt}
                    </CheckOption>
                  ))}
                </div>
              )}
            </Field>
          ))}
        </Section>
      )}

      <Section title="Waiver & signature">
        <div className="rounded-md border bg-muted/30 p-4 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm">
          {waiverText}
        </div>
        <Field label="">
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox checked={agreeWaiver} onCheckedChange={(v) => setAgreeWaiver(v === true)} />
            <span>I have read and agree to the waiver above. I confirm the information I provided is accurate to the best of my knowledge.</span>
          </label>
        </Field>
        <Field label="Type your full legal name *">
          <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} maxLength={120} autoComplete="name" />
        </Field>
      </Section>

      <div className="flex justify-end pt-4 border-t">
        <Button type="button" onClick={handleSubmit} disabled={pending || !agreeWaiver || signatureName.trim().length < 2}>
          {pending ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Submitting...</> : "Sign & Submit"}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function CheckOption({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/30">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

function RadioRow({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
            value === opt ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted/30"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
