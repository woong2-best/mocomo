"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivityOptional } from "@/components/activities/activity-provider";

export function DmActivityButton() {
  const activity = useActivityOptional();
  if (!activity) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="rounded-xl shrink-0"
      onClick={activity.openPicker}
      title="Activities"
      aria-label="Activities"
    >
      <Sparkles className="h-4 w-4" />
    </Button>
  );
}
