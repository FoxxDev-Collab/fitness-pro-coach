import type { Metadata } from "next";
import { PortalAuthShell } from "@/components/portal/portal-auth-shell";
import { PortalVerify } from "@/components/portal/portal-verify";

export const metadata: Metadata = {
  title: "Signing in — Praevio",
};

export default async function PortalVerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <PortalAuthShell>
      <PortalVerify token={token} />
    </PortalAuthShell>
  );
}
