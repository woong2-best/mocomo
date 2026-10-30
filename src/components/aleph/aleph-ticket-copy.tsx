"use client";

import { useState } from "react";
import { createTranslator } from "@/lib/i18n/messages";
import {
  ALEPH_ENDPOINT_LABEL,
  ALEPH_PROTOCOL_LABEL,
  ALEPH_SIGNATURE_LINE,
  ALEPH_TICKET_COMMAND,
} from "@/lib/aleph-ticket";

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
        <span className="key">Endpoint</span>
        {"   "}
        {ALEPH_ENDPOINT_LABEL}
        {"\n"}
        <span className="key">Protocol</span>
        {"   "}
        {ALEPH_PROTOCOL_LABEL}
        {"\n"}
        <span className="key">Signature</span>
        {"  "}
        {ALEPH_SIGNATURE_LINE}
      </pre>
    </div>
  );
}
