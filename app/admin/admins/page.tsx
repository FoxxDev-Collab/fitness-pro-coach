import { ShieldCheck, ChevronRight, Mail } from "lucide-react";
import Link from "next/link";
import { listAdmins } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteAdminButton } from "./invite-button";

export default async function AdminAdminsPage() {
  const admins = await listAdmins();

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admins</h1>
          <p className="text-sm text-muted-foreground tabular-nums">{admins.length} total</p>
        </div>
        <InviteAdminButton />
      </div>

      {admins.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No admin users — invite the first one above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {admins.map((a) => (
            <Link
              key={a.id}
              href={`/admin/coaches/${a.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="size-4 text-primary shrink-0" />
                  <p className="font-medium truncate">{a.name || "Unnamed"}</p>
                  <Badge variant={a.active ? "default" : "secondary"}>
                    {a.active ? "Active" : "Disabled"}
                  </Badge>
                  {a.emailVerified ? (
                    <Badge variant="outline" className="gap-1">
                      <Mail className="size-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-warning/50 text-warning">
                      <Mail className="size-3" /> Pending
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate ml-6">{a.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                  Joined {new Date(a.createdAt).toLocaleDateString()}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
