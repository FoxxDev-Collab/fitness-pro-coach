import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Mail, Globe, ShieldCheck, Calendar, MoreHorizontal } from "lucide-react";
import { getCoachDetail } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserActionsMenu } from "@/components/admin/user-actions";
import { CoachEditForm } from "./edit-form";

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coach = await getCoachDetail(id);
  if (!coach) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/coaches">
          <ArrowLeft className="size-4 mr-1.5" /> All coaches
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <CardTitle className="text-xl">{coach.name || "Unnamed"}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{coach.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Joined {new Date(coach.createdAt).toLocaleDateString()}
                {coach.onboardedAt && (
                  <> · Onboarded {new Date(coach.onboardedAt).toLocaleDateString()}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={coach.active ? "default" : "secondary"}>
                {coach.active ? "Active" : "Disabled"}
              </Badge>
              {coach.emailVerified ? (
                <Badge variant="outline" className="gap-1">
                  <Mail className="size-3" /> Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-warning/50 text-warning">
                  <Mail className="size-3" /> Unverified
                </Badge>
              )}
              {coach.mfaEnabled && (
                <Badge variant="outline" className="gap-1">
                  <ShieldCheck className="size-3" /> MFA
                </Badge>
              )}
              <UserActionsMenu
                userId={coach.id}
                userEmail={coach.email}
                userName={coach.name}
                role="COACH"
                active={coach.active}
                canImpersonate
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coach profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ProfileField label="Business name" value={coach.businessName} />
          <ProfileField label="Specialty" value={coach.specialty} />
          <ProfileField label="Timezone" value={coach.timezone} />
          <ProfileField
            label="Intake URL"
            value={
              coach.intakeSlug ? (
                <span className="font-mono text-xs">praevio.fitness/intake/{coach.intakeSlug}</span>
              ) : null
            }
          />
          <div className="sm:col-span-2">
            <ProfileField label="Bio" value={coach.bio} multiline />
          </div>
          <div className="sm:col-span-2 pt-2 border-t flex items-center gap-2">
            {coach.onboardedAt ? (
              <Badge variant="outline" className="gap-1">
                <Sparkles className="size-3" /> Onboarding complete
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-warning/50 text-warning">
                <Calendar className="size-3" /> Onboarding pending
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <CoachEditForm
        userId={coach.id}
        name={coach.name ?? ""}
        email={coach.email}
        businessName={coach.businessName ?? ""}
        specialty={coach.specialty ?? ""}
        bio={coach.bio ?? ""}
        timezone={coach.timezone ?? ""}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clients ({coach.clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coach.clients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No clients</p>
          ) : (
            <div className="space-y-2">
              {coach.clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/clients/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm flex items-center gap-2">
                      {c.name}
                      {!c.active && <Badge variant="secondary">Inactive</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{c.email || "No email"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {c._count.assignments} programs
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teams ({coach.teams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coach.teams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No teams</p>
          ) : (
            <div className="space-y-2">
              {coach.teams.map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/teams/${t.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.sport || "No sport"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {t._count.athletes} athletes
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Programs ({coach.programs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coach.programs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No programs</p>
          ) : (
            <div className="space-y-2">
              {coach.programs.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {p._count.workouts} workouts · {p._count.assignments} assigned
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: React.ReactNode | null | undefined;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      {value ? (
        <p className={`text-sm mt-1 ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</p>
      ) : (
        <p className="text-sm mt-1 text-muted-foreground italic">Not set</p>
      )}
    </div>
  );
}

// Suppress unused import — MoreHorizontal kept available for future actions row
void MoreHorizontal;
void Globe;
