import { Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParsedCallEvent } from "@/lib/chat-call-event";

function formatCallEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatCallEventCard({
  event,
  createdAt,
  align,
}: {
  event: ParsedCallEvent;
  createdAt: string;
  align: "left" | "right";
}) {
  const isVideo = event.callType === "VIDEO";
  const started = event.phase === "started";
  const Icon = isVideo ? (started ? Video : VideoOff) : started ? Phone : PhoneOff;

  return (
    <div className={cn("flex w-full", align === "right" ? "justify-end" : "justify-start")}>
      <div className="flex min-w-[220px] max-w-sm items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3 text-white shadow-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{event.label}</p>
          <p className="mt-0.5 text-xs text-white/55 tabular-nums">{formatCallEventTime(createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
