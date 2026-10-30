"use client";

import { useState } from "react";
import { createTranslator } from "@/lib/i18n/messages";
import { ALEPH_PUBLIC_AGENT_SIG, ALEPH_TICKET_COMMAND } from "@/lib/aleph-ticket";

const t = createTranslator("en");

function SortGlyph() {
  return (
    <svg viewBox="0 0 8 12" className="h-3 w-2 shrink-0 text-[#9aa0a6]" aria-hidden>
      <path d="M4 0.6 L7.2 4.6 H0.8 Z" fill="currentColor" />
      <path d="M4 11.4 L7.2 7.4 H0.8 Z" fill="currentColor" />
    </svg>
  );
}

function HeaderCell({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1 whitespace-nowrap text-[12px] font-normal text-[#6b7280]">
      <span>{label}</span>
      <SortGlyph />
    </div>
  );
}

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

  const copyLabel = copied ? t("aleph.copied") : t("aleph.copy");

  return (
    <div className="mx-auto mt-12 w-full max-w-5xl overflow-hidden rounded-lg border border-[#e8e8e8] bg-white font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] text-[#1d1d1f] shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
      <p className="px-5 py-3 text-[13px] leading-5 text-[#6b7280]">{t("aleph.tableCaption")}</p>

      <div className="space-y-3 border-t border-[#ececec] px-5 py-4 sm:hidden">
        <div>
          <div className="text-[11px] text-[#6b7280]">{t("aleph.tableName")}</div>
          <div className="break-all font-medium text-[#111827]">$env:M2M_AGENT_SIG</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-[#6b7280]">{t("aleph.tableType")}</div>
            <div className="text-[#111827]">{t("aleph.tableTypeValue")}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#6b7280]">{t("aleph.tableTtl")}</div>
            <div className="text-[#111827]">{t("aleph.tableTtlValue")}</div>
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[#6b7280]">{t("aleph.tableContent")}</div>
          <div className="break-all text-[#111827]">{ALEPH_PUBLIC_AGENT_SIG}</div>
        </div>
        <button
          type="button"
          onClick={() => void copyTicket()}
          className="text-[13px] text-[#6b7280] hover:underline"
        >
          {copyLabel}
        </button>
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <div role="table" className="min-w-[860px] border-t border-[#ececec] text-[13px] leading-5">
          <div
            role="row"
            className="grid grid-cols-[32px_minmax(220px,1.5fr)_72px_minmax(200px,1.4fr)_72px_72px] items-center gap-3 border-b border-[#ececec] px-5 py-2.5"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-[#c5c9d0] bg-white" />
            <HeaderCell label={t("aleph.tableName")} />
            <HeaderCell label={t("aleph.tableType")} />
            <HeaderCell label={t("aleph.tableContent")} />
            <HeaderCell label={t("aleph.tableTtl")} />
            <div />
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => void copyTicket()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                void copyTicket();
              }
            }}
            className="grid cursor-pointer grid-cols-[32px_minmax(220px,1.5fr)_72px_minmax(200px,1.4fr)_72px_72px] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[#f7f7f8]"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-[#c5c9d0] bg-white" />
            <div className="truncate font-medium text-[#111827]" title={ALEPH_TICKET_COMMAND}>
              $env:M2M_AGENT_SIG
            </div>
            <div className="text-[#374151]">{t("aleph.tableTypeValue")}</div>
            <div className="truncate text-[#111827]" title={ALEPH_PUBLIC_AGENT_SIG}>
              {ALEPH_PUBLIC_AGENT_SIG}
            </div>
            <div className="text-[#374151]">{t("aleph.tableTtlValue")}</div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void copyTicket();
              }}
              className="justify-self-start whitespace-nowrap text-[13px] text-[#6b7280] hover:underline"
            >
              {copyLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
