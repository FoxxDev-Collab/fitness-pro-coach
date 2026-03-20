import { verifyEmail } from "@/lib/actions/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await verifyEmail(token);

  if (result.error) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <XCircle className="size-10 text-destructive" />
          </div>
          <CardTitle>Verification failed</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" asChild>
            <Link href="/login">Go to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <CheckCircle className="size-10 text-success" />
        </div>
        <CardTitle>Email verified</CardTitle>
        <CardDescription>Your email has been verified successfully.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" asChild>
          <Link href="/">Continue</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
