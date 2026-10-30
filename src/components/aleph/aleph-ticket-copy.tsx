"use client";

import { useState } from "react";
import { createTranslator } from "@/lib/i18n/messages";
import { ALEPH_PUBLIC_AGENT_SIG, ALEPH_TICKET_COMMAND, ALEPH_VERSION } from "@/lib/aleph-ticket";

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
    <div className="terminal-wrap">
      <div className="terminal-bar mono">
        <span>aleph.sh</span>
        <button type="button" className="terminal-copy mono" onClick={() => void copyTicket()}>
          {copied ? t("aleph.copied") : t("aleph.copy")}
        </button>
      </div>
      <pre className="terminal">
        <span className="comment">{`# MoCoMo Aleph Public Access Token (v${ALEPH_VERSION})`}</span>
        {`
$env:M2M_AGENT_SIG="${ALEPH_PUBLIC_AGENT_SIG}"
$env:ALEPH_VERSION="${ALEPH_VERSION}"`}
      </pre>
    </div>
  );
}
