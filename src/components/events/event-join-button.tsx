"use client";

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
        "이벤트 참가"
      )}
    </Button>
  );
}
