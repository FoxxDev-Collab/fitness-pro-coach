import type { Metadata } from "next";
import { PortalAuthShell } from "@/components/portal/portal-auth-shell";
import { PortalLoginForm } from "@/components/portal/portal-login-form";

export const metadata: Metadata = {
  title: "Sign in — Praevio",
};

export default function PortalLoginPage() {
  return (
    <PortalAuthShell>
      <PortalLoginForm />
    </PortalAuthShell>
  );
}
