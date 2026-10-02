"use client";
import { createTranslator } from "@/lib/i18n/messages";
const i18n = createTranslator("en");


import { useState, useTransition } from "react";
import { joinEvent } from "@/actions/events";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function EventJoinButton({ eventId }: { eventId: string }) {
  const [joined, setJoined] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      className="rounded-xl mt-3"
      disabled={pending || joined}
      onClick={() =>
        startTransition(async () => {
          await joinEvent(eventId);
          setJoined(true);
        })
      }
    >
      {joined ? (
        <>
          <Check className="h-4 w-4 mr-1" />
          참가 완료
        </>
      ) : (
        i18n("events.s7wsmhs")
      )}
    </Button>
  );
}
