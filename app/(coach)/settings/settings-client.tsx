"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PasswordStrength } from "@/components/password-strength";
import {
  updateProfile,
  changePassword,
  resendVerification,
  setupMfa,
  enableMfa,
  disableMfa,
} from "@/lib/actions/auth";
import { Check, Shield, ShieldCheck, ShieldOff, Mail, Loader2 } from "lucide-react";

export function SettingsClient({
  name: initialName,
  email,
  emailVerified,
  mfaEnabled,
  joinedAt,
}: {
  name: string;
  email: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  joinedAt: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account</p>
      </div>

      <ProfileSection name={initialName} email={email} emailVerified={emailVerified} joinedAt={joinedAt} />
      <ChangePasswordSection />
      <MfaSection mfaEnabled={mfaEnabled} />
    </div>
  );
}

function ProfileSection({ name, email, emailVerified, joinedAt }: {
  name: string; email: string; emailVerified: boolean; joinedAt: string;
}) {
  const [formName, setFormName] = useState(name);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSave(formData: FormData) {
    setLoading(true);
    setMsg(null);
    const result = await updateProfile(formData);
    setMsg(result.error ? { type: "error", text: result.error } : { type: "success", text: "Profile updated" });
    setLoading(false);
  }

  async function handleResendVerification() {
    setVerifying(true);
    const result = await resendVerification();
    setMsg(result.error
      ? { type: "error", text: result.error }
      : { type: "success", text: "Verification email sent" });
    setVerifying(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>Your account information</CardDescription>
      </CardHeader>
      <form action={handleSave}>
        <CardContent className="space-y-4">
          {msg && (
            <div className={`rounded-md border p-3 text-sm ${
              msg.type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-success/50 bg-success/10 text-success"
            }`}>{msg.text}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="flex items-center gap-2">
              <Input value={email} disabled className="flex-1" />
              {emailVerified ? (
                <Badge variant="secondary" className="shrink-0">
                  <Check className="size-3 mr-1" /> Verified
                </Badge>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={handleResendVerification} disabled={verifying} className="shrink-0">
                  {verifying ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Mail className="size-3.5 mr-1" />}
                  Verify
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Joined {new Date(joinedAt).toLocaleDateString()}</p>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ChangePasswordSection() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMsg(null);
    const result = await changePassword(formData);
    if (result.error) {
      setMsg({ type: "error", text: result.error });
    } else {
      setMsg({ type: "success", text: "Password changed successfully" });
      setPassword("");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change Password</CardTitle>
        <CardDescription>Update your password</CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {msg && (
            <div className={`rounded-md border p-3 text-sm ${
              msg.type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-success/50 bg-success/10 text-success"
            }`}>{msg.text}</div>
          )}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">New Password</Label>
            <Input
              id="pw"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordStrength password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPw">Confirm New Password</Label>
            <Input id="confirmPw" name="confirmPassword" type="password" required autoComplete="new-password" />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Changing..." : "Change password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function MfaSection({ mfaEnabled }: { mfaEnabled: boolean }) {
  const [state, setState] = useState<"idle" | "setup" | "verify" | "disable">("idle");
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setLoading(true);
    setMsg(null);
    const result = await setupMfa();
    if (result.error) {
      setMsg({ type: "error", text: result.error });
    } else if (result.uri) {
      setQrUri(result.uri);
      setSecret(result.secret || null);
      setState("verify");
    }
    setLoading(false);
  }

  async function handleVerify(formData: FormData) {
    setLoading(true);
    setMsg(null);
    const result = await enableMfa(formData);
    if (result.error) {
      setMsg({ type: "error", text: result.error });
    } else {
      setMsg({ type: "success", text: "MFA enabled successfully" });
      setState("idle");
    }
    setLoading(false);
  }

  async function handleDisable(formData: FormData) {
    setLoading(true);
    setMsg(null);
    const result = await disableMfa(formData);
    if (result.error) {
      setMsg({ type: "error", text: result.error });
    } else {
      setMsg({ type: "success", text: "MFA disabled" });
      setState("idle");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4" /> Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              {mfaEnabled ? "MFA is enabled on your account" : "Add an extra layer of security"}
            </CardDescription>
          </div>
          {mfaEnabled && (
            <Badge variant="secondary">
              <ShieldCheck className="size-3 mr-1" /> Enabled
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {msg && (
          <div className={`rounded-md border p-3 text-sm ${
            msg.type === "error" ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-success/50 bg-success/10 text-success"
          }`}>{msg.text}</div>
        )}

        {state === "idle" && !mfaEnabled && (
          <Button onClick={handleSetup} disabled={loading} variant="outline">
            {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <ShieldCheck className="size-4 mr-2" />}
            Set up MFA
          </Button>
        )}

        {state === "idle" && mfaEnabled && (
          <Button onClick={() => setState("disable")} variant="outline">
            <ShieldOff className="size-4 mr-2" /> Disable MFA
          </Button>
        )}

        {state === "verify" && qrUri && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
            </p>
            <div className="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
              <QrCode uri={qrUri} />
            </div>
            {secret && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Or enter this code manually:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded select-all">{secret}</code>
              </div>
            )}
            <form action={handleVerify} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Verification Code</Label>
                <Input
                  id="mfaCode"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  required
                  autoComplete="one-time-code"
                  className="text-center text-lg tracking-widest max-w-48 mx-auto"
                />
              </div>
              <div className="flex gap-2 justify-center">
                <Button type="button" variant="outline" onClick={() => setState("idle")}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Verifying..." : "Enable MFA"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {state === "disable" && (
          <form action={handleDisable} className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter your password to disable MFA.</p>
            <div className="space-y-2">
              <Label htmlFor="disablePw">Password</Label>
              <Input id="disablePw" name="password" type="password" required autoComplete="current-password" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setState("idle")}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? "Disabling..." : "Disable MFA"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function QrCode({ uri }: { uri: string }) {
  const [src, setSrc] = useState<string | null>(null);

  if (!src) {
    // Generate QR code client-side
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(uri, { width: 200, margin: 0 }).then(setSrc);
    });
    return <div className="w-[200px] h-[200px] bg-muted rounded animate-pulse" />;
  }

  return <img src={src} alt="MFA QR Code" width={200} height={200} />;
}
