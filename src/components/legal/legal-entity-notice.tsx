import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_ENTITY_DISCLOSURE,
  PAYMENT_LEGAL_SECTIONS,
  THIRD_PARTY_STREAMING_DISCLAIMER,
} from "@/lib/legal-content";
import { cn } from "@/lib/utils";

function LegalEmail({ className }: { className?: string }) {
  return (
    <a
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      className={cn("text-primary hover:underline break-all", className)}
    >
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}

/** Site-wide footer business disclosure */
export function LegalEntityFooterNotice({ className = "" }: { className?: string }) {
  const d = LEGAL_ENTITY_DISCLOSURE;
  return (
    <div
      className={cn(
        "text-center text-[11px] leading-relaxed text-muted-foreground space-y-1",
        className
      )}
    >
      <p className="font-medium text-foreground/80">{d.entity}</p>
      <p>
        {d.jurisdiction} · Registered Office: {d.address}
      </p>
      <p>
        Contact · DMCA: <LegalEmail />
      </p>
      <p className="pt-1 max-w-2xl mx-auto px-3 text-pretty">{THIRD_PARTY_STREAMING_DISCLAIMER}</p>
    </div>
  );
}

/** Full payment / ad registration legal copy (entity + policy sections). */
export function PaymentLegalNoticeContent({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const d = LEGAL_ENTITY_DISCLOSURE;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-[10px] leading-relaxed text-muted-foreground space-y-1">
        <p>
          <span className="font-medium text-foreground/80">Legal Entity:</span> {d.entity}
        </p>
        <p>
          <span className="font-medium text-foreground/80">Jurisdiction:</span> {d.jurisdiction}
        </p>
        <p>
          <span className="font-medium text-foreground/80">Registered Office:</span> {d.address}
        </p>
        <p>
          <span className="font-medium text-foreground/80">Contact:</span> <LegalEmail />
        </p>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-border/60">
        {PAYMENT_LEGAL_SECTIONS.slice(1).map((section) =>
          compact ? (
            <p key={section.title} className="text-[10px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/75">{section.title}: </span>
              {section.body}{" "}
              {"href" in section && section.href ? (
                <Link href={section.href} className="text-primary hover:underline">
                  {t("legal.sz1ro")}
                </Link>
              ) : null}
            </p>
          ) : (
            <details key={section.title} className="group">
              <summary className="cursor-pointer text-[10px] font-medium text-foreground/80 list-none flex items-center justify-between gap-2">
                {section.title}
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                {section.body}{" "}
                {"href" in section && section.href ? (
                  <Link href={section.href} className="text-primary hover:underline">
                    {t("legal.soctne0")}
                  </Link>
                ) : null}
              </p>
            </details>
          )
        )}
      </div>

      <p className="text-[9px] text-muted-foreground/90 pt-1">
        {t("legal.skjyxdp")}
      </p>
    </div>
  );
}

/** Checkout / event registration disclosure (full sections) */
export function PaymentLegalNotice({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2",
        className
      )}
    >
      <p className="text-[11px] font-semibold text-foreground">{t("legal.sk4z3b1")}</p>
      <PaymentLegalNoticeContent compact={compact} />
    </div>
  );
}
