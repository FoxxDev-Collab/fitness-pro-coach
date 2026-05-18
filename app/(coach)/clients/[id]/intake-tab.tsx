import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { RequestRetakeButton } from "./request-retake-button";

type Injury = { description: string; year: number; side: string; active: boolean };

export type IntakeResponseData = {
  id: string;
  dateOfBirth: Date | null;
  sex: string | null;
  heightInches: number | null;
  weightLbs: number | null;
  occupation: string | null;
  medicalConditions: string[];
  conditionsOther: string | null;
  medications: string | null;
  pregnancyStatus: string | null;
  physicianRestrictions: string | null;
  physicianName: string | null;
  physicianPhone: string | null;
  injuries: unknown;
  chronicPain: string | null;
  painAreas: string[];
  waiverTextSnapshot: string;
  signatureName: string;
  signatureIp: string;
  signatureUserAgent: string;
  signedAt: Date;
  answers: {
    id: string;
    questionTextSnapshot: string;
    questionTypeSnapshot: string;
    textValue: string | null;
    choiceValues: string[];
  }[];
};

export function IntakeTab({ clientId, response }: { clientId: string; response: IntakeResponseData | null }) {
  if (!response) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Intake pending — the client will complete this on first login.
        </CardContent>
      </Card>
    );
  }

  const injuries = Array.isArray(response.injuries) ? (response.injuries as Injury[]) : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" /> Signed waiver
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Signed by <strong>{response.signatureName}</strong> on {new Date(response.signedAt).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                IP {response.signatureIp}
              </p>
            </div>
            <Badge variant="secondary">Locked</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">View signed waiver text</summary>
            <div className="mt-3 rounded-md border bg-muted/30 p-3 whitespace-pre-wrap text-xs max-h-72 overflow-y-auto">
              {response.waiverTextSnapshot}
            </div>
          </details>
        </CardContent>
      </Card>

      <Section title="Personal">
        <KV label="Date of birth" value={response.dateOfBirth ? new Date(response.dateOfBirth).toLocaleDateString() : null} />
        <KV label="Sex" value={response.sex} />
        <KV label="Height" value={response.heightInches ? `${response.heightInches} in` : null} />
        <KV label="Weight" value={response.weightLbs ? `${response.weightLbs} lbs` : null} />
        <KV label="Occupation" value={response.occupation} />
      </Section>

      <Section title="Medical">
        <KV label="Conditions" value={response.medicalConditions.length > 0 ? response.medicalConditions.join(", ") : null} />
        <KV label="Other conditions" value={response.conditionsOther} />
        <KV label="Medications" value={response.medications} multiline />
        <KV label="Pregnancy / postpartum" value={response.pregnancyStatus} />
      </Section>

      <Section title="Physician restrictions">
        <KV label="Restrictions" value={response.physicianRestrictions} multiline />
        <KV label="Physician name" value={response.physicianName} />
        <KV label="Physician phone" value={response.physicianPhone} />
      </Section>

      <Section title="Injuries / surgeries">
        {injuries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">None reported.</p>
        ) : (
          <ul className="space-y-2">
            {injuries.map((inj, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{inj.description}</span> · {inj.year} · {inj.side} · {inj.active ? "Active" : "Resolved"}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Chronic pain">
        <KV label="Areas" value={response.painAreas.length > 0 ? response.painAreas.join(", ") : null} />
        <KV label="Detail" value={response.chronicPain} multiline />
      </Section>

      {response.answers.length > 0 && (
        <Section title="Additional questions">
          {response.answers.map((a) => (
            <KV
              key={a.id}
              label={a.questionTextSnapshot}
              value={a.choiceValues.length > 0 ? a.choiceValues.join(", ") : a.textValue}
              multiline
            />
          ))}
        </Section>
      )}

      <div className="pt-2">
        <RequestRetakeButton clientId={clientId} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function KV({ label, value, multiline }: { label: string; value: string | null | undefined; multiline?: boolean }) {
  return (
    <div className={multiline ? "" : "flex gap-3 text-sm"}>
      <p className="text-xs text-muted-foreground font-medium shrink-0 min-w-32">{label}</p>
      {value
        ? <p className={`text-sm ${multiline ? "mt-0.5 whitespace-pre-wrap" : ""}`}>{value}</p>
        : <p className="text-sm text-muted-foreground italic">Not provided</p>}
    </div>
  );
}
