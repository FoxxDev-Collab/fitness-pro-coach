"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/lib/actions/auth";
import { Loader2, Mail } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [unverified, setUnverified] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error === "MFA_REQUIRED") {
      setMfaRequired(true);
      setLoading(false);
    } else if (result?.error === "EMAIL_NOT_VERIFIED") {
      setUnverified(true);
      setLoading(false);
    } else if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  if (unverified) {
    return (
      <Card className="text-center">
        <CardHeader className="items-center">
          <div className="size-16 rounded-full bg-warning/10 flex items-center justify-center mb-2">
            <Mail className="size-7 text-warning" />
          </div>
          <CardTitle>Email not verified</CardTitle>
          <CardDescription>
            Please check your inbox and click the verification link before signing in.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-3 pt-2">
          <Button variant="outline" className="w-full" onClick={() => setUnverified(false)}>
            Try again
          </Button>
          <p className="text-xs text-muted-foreground">
            Didn&apos;t receive it? Check spam or{" "}
            <Link href="/signup" className="underline underline-offset-4 hover:text-foreground">
              sign up again
            </Link>
          </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          {mfaRequired ? "Enter your authenticator code" : "Enter your email and password to continue"}
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className={mfaRequired ? "hidden" : "space-y-2"}>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className={mfaRequired ? "hidden" : "space-y-2"}>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          {mfaRequired && (
            <div className="space-y-2">
              <Label htmlFor="mfaCode">Authenticator Code</Label>
              <Input
                id="mfaCode"
                name="mfaCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                required
                autoComplete="one-time-code"
                className="text-center text-lg tracking-widest"
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : mfaRequired ? (
              "Verify"
            ) : (
              "Sign in"
            )}
          </Button>
          {!mfaRequired && (
            <p className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-foreground underline underline-offset-4 hover:text-foreground/80">
                Sign up
              </Link>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
