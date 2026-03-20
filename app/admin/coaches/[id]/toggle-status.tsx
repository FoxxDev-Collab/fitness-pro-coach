"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toggleUserStatus } from "@/lib/actions/admin";

export function ToggleStatusButton({
  userId,
  active,
}: {
  userId: string;
  active: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await toggleUserStatus(userId);
    setLoading(false);
  }

  return (
    <Button
      variant={active ? "destructive" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "..." : active ? "Disable" : "Enable"}
    </Button>
  );
}
