"use client";

import { WifiOff } from "lucide-react";
import { CALL_NAT_BLOCKED_MESSAGE, CALL_NAT_BLOCKED_TITLE } from "@/lib/peer-call/p2p-ice";

export function CallNatBlockedDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-nat-blocked-title"
      aria-describedby="call-nat-blocked-body"
    >
      <div className="w-full max-w-md rounded-3xl bg-zinc-950 px-6 py-7 text-white shadow-2xl ring-1 ring-white/10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
          <WifiOff className="h-7 w-7" />
        </div>
        <h2 id="call-nat-blocked-title" className="mt-5 text-center text-xl font-semibold tracking-tight">
          {CALL_NAT_BLOCKED_TITLE}
        </h2>
        <p id="call-nat-blocked-body" className="mt-3 text-center text-sm leading-relaxed text-white/70">
          {CALL_NAT_BLOCKED_MESSAGE}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-white py-3 text-sm font-semibold text-zinc-950 transition-transform active:scale-[0.99]"
        >
          OK
        </button>
      </div>
    </div>
  );
}
