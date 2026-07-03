"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { verifyPortalLogin } from "@/lib/actions/portal";
import { Loader2, LinkIcon } from "lucide-react";

export function PortalVerify({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Guard against React's double-invoke so the single-use token isn't consumed
    // twice. On success the server action redirects to /portal (navigates away).
    if (started.current) return;
    started.current = true;
    verifyPortalLogin(token).then((result) => {
      if (result?.error) setError(result.error);
    });
  }, [token]);

  if (error) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <LinkIcon className="size-6 text-destructive" />
          </div>
          <CardTitle>Link expired</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/portal/login">Request a new link</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 className="size-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </CardContent>
    </Card>
  );
}
