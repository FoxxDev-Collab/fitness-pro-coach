"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminUpdateUser } from "@/lib/actions/admin";

const MAX_BIO = 240;

export function CoachEditForm(props: {
  userId: string;
  name: string;
  email: string;
  businessName: string;
  specialty: string;
  bio: string;
  timezone: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(props.name);
  const [email, setEmail] = useState(props.email);
  const [businessName, setBusinessName] = useState(props.businessName);
  const [specialty, setSpecialty] = useState(props.specialty);
  const [bio, setBio] = useState(props.bio);
  const [timezone, setTimezone] = useState(props.timezone);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const dirty =
    name !== props.name ||
    email !== props.email ||
    businessName !== props.businessName ||
    specialty !== props.specialty ||
    bio !== props.bio ||
    timezone !== props.timezone;

  function handleSubmit() {
    setMsg(null);
    startTransition(async () => {
      const res = await adminUpdateUser({
        userId: props.userId,
        name,
        email,
        businessName: businessName || null,
        specialty: specialty || null,
        bio: bio || null,
        timezone: timezone || null,
      });
      if ("error" in res && res.error) {
        setMsg({ type: "error", text: res.error });
      } else {
        setMsg({ type: "success", text: "Profile updated" });
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit (admin override)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Changing email will reset the user&apos;s verification status.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {msg && (
          <div
            className={`rounded-md border p-3 text-sm flex gap-2 ${
              msg.type === "error"
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-success/50 bg-success/10 text-success"
            }`}
          >
            {msg.type === "error" && <AlertCircle className="size-4 mt-0.5 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adm-name">Name</Label>
            <Input id="adm-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adm-email">Email</Label>
            <Input id="adm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adm-business">Business name</Label>
            <Input id="adm-business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adm-specialty">Specialty</Label>
            <Input id="adm-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adm-tz">Timezone</Label>
            <Input id="adm-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="adm-bio">Bio</Label>
          <Textarea
            id="adm-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {bio.length} / {MAX_BIO}
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={pending || !dirty}>
          {pending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}
