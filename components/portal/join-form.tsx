"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requestPortalLink } from "@/lib/actions/portal";
import { Loader2, Mail } from "lucide-react";

export function JoinForm({ code }: { code: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await requestPortalLink(
      String(formData.get("code") ?? ""),
      String(formData.get("email") ?? ""),
    );
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Mail className="size-6 text-primary" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If your email is on this team&apos;s roster, we&apos;ve sent a sign-in
            link. It expires in 30 minutes.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            Don&apos;t see it? Check spam, or ask your coach to confirm the email
            on your athlete&apos;s profile.
          </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow your team</CardTitle>
        <CardDescription>
          Enter the team code and your email. We&apos;ll send you a sign-in link —
          no password needed.
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="code">Team code</Label>
            <Input
              id="code"
              name="code"
              defaultValue={code}
              required
              autoCapitalize="characters"
              autoComplete="off"
              className="uppercase tracking-widest font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Your email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Sending…
              </>
            ) : (
              "Send my sign-in link"
            )}
          </Button>
          <Link
            href="/portal/login"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Already joined? Sign in
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
