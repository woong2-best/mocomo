"use client";

import { useState } from "react";
import { createTranslator } from "@/lib/i18n/messages";
import { ALEPH_PUBLIC_AGENT_SIG, ALEPH_TICKET_COMMAND } from "@/lib/aleph-ticket";

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
    <div className="access-card">
      <div className="machine-label">{t("aleph.machineLabel")}</div>
      <h2>{t("aleph.accessTitle")}</h2>
      <div
        role="button"
        tabIndex={0}
        className="terminal"
        onClick={() => void copyTicket()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void copyTicket();
          }
        }}
      >
        <div className="comment">{t("aleph.terminalComment")}</div>
        <div>
          <span className="key">$env:M2M_AGENT_SIG=</span>
          {`"${ALEPH_PUBLIC_AGENT_SIG}"`}
        </div>
      </div>
      <div className="copy-hint">{copied ? t("aleph.copied") : t("aleph.copy")}</div>
      <div className="channel">{t("aleph.channel")}</div>
    </div>
  );
}
