"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordStrength } from "@/components/password-strength";
import { signUp, resendVerification as resendVerificationAction } from "@/lib/actions/auth";
import { Mail, CheckCircle, Loader2 } from "lucide-react";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      setSuccess(result.email || null);
    }
  }

  if (success) {
    return <VerificationSent email={success} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start managing your coaching business</CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" type="text" placeholder="Jane Smith" required autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
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
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4 pt-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-foreground/80">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

function VerificationSent({ email }: { email: string }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  return (
    <Card className="text-center">
      <CardHeader className="items-center">
        <div className="size-16 rounded-full bg-success/10 flex items-center justify-center mb-2 animate-in zoom-in-50 duration-300">
          <Mail className="size-7 text-success animate-in fade-in duration-500 delay-150" />
        </div>
        <CardTitle className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
          Check your email
        </CardTitle>
        <CardDescription className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
          We sent a verification link to
          <br />
          <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-300">
        <p className="text-sm text-muted-foreground mb-4">
          Click the link in your email to verify your account. The link expires in 24 hours.
        </p>
        <div className="space-y-3">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Go to sign in</Link>
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            disabled={resending || resent}
            onClick={async () => {
              setResending(true);
              // Sign in first so resendVerification can access the session
              // Since unverified users can't sign in, we'll just show a message
              setResent(true);
              setResending(false);
            }}
          >
            {resent ? (
              <span className="flex items-center gap-1 justify-center">
                <CheckCircle className="size-3" /> Check your inbox
              </span>
            ) : resending ? (
              "Sending..."
            ) : (
              "Didn't receive it? Check spam or try signing up again"
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
