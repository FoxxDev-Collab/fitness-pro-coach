"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { updateCoachProfile } from "@/lib/actions/coach-profile";
import type { UpdateCoachProfileInput } from "@/lib/validations/coach-profile";

const SPECIALTIES = [
  "Strength & Conditioning",
  "Powerlifting / Olympic lifting",
  "Bodybuilding / Hypertrophy",
  "General fitness / Wellness",
  "Postpartum / Pre-natal",
  "Post-rehab / Corrective",
  "Athletic performance",
  "Endurance / Running",
  "Other",
];

const MAX_BIO = 240;

export function CoachProfileSection(props: {
  businessName: string;
  specialty: string;
  bio: string;
  timezone: string;
}) {
  const [businessName, setBusinessName] = useState(props.businessName);
  const [specialty, setSpecialty] = useState(props.specialty);
  const [bio, setBio] = useState(props.bio);
  const [timezone, setTimezone] = useState(props.timezone);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSave() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateCoachProfile({
        businessName: businessName.trim() || null,
        specialty: specialty || null,
        bio: bio.trim() || null,
        timezone: timezone.trim() || null,
      } as UpdateCoachProfileInput);
      if ("error" in res && res.error) {
        setMsg({ type: "error", text: res.error });
      } else {
        setMsg({ type: "success", text: "Coach profile saved" });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Coach profile</CardTitle>
        <CardDescription>How your business shows up to clients</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {msg && (
          <div
            className={`rounded-md border p-3 text-sm ${
              msg.type === "error"
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-success/50 bg-success/10 text-success"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Smith Strength Co."
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialty">Specialty</Label>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger id="specialty">
              <SelectValue placeholder="Select your focus area..." />
            </SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Short bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
            placeholder="Two sentences about how you work with clients..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {bio.length} / {MAX_BIO}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="America/Denver"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
