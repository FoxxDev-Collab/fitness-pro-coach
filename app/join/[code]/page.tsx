import type { Metadata } from "next";
import { PortalAuthShell } from "@/components/portal/portal-auth-shell";
import { JoinForm } from "@/components/portal/join-form";
import { normalizeJoinCode } from "@/lib/portal/code";

export const metadata: Metadata = {
  title: "Join your team — Praevio",
};

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <PortalAuthShell>
      <JoinForm code={normalizeJoinCode(code ?? "")} />
    </PortalAuthShell>
  );
}
