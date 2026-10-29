"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { createTranslator } from "@/lib/i18n/messages";
import { ALEPH_TICKET_COMMAND } from "@/lib/aleph-ticket";

const t = createTranslator("en");

export function AlephTicketCopy() {
  const [copied, setCopied] = useState(false);

  async function copyTicket() {
    try {
      await navigator.clipboard.writeText(ALEPH_TICKET_COMMAND);
    } catch {
      const field = document.createElement("textarea");
      field.value = ALEPH_TICKET_COMMAND;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      document.body.removeChild(field);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mx-auto mt-14 flex w-full max-w-xl flex-col items-center gap-4">
      <code
        onClick={() => void copyTicket()}
        className="block w-full cursor-pointer select-all rounded-xl border border-white/20 bg-black/60 px-5 py-4 text-center font-mono text-sm leading-relaxed text-white shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md sm:text-lg"
        {ALEPH_TICKET_COMMAND}
      </code>
      <button
        type="button"
        onClick={() => void copyTicket()}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
      >
        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        {copied ? t("aleph.copied") : t("aleph.copy")}
      </button>
    </div>
  );
}
