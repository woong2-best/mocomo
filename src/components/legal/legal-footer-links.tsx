"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import { LegalEntityFooterNotice } from "@/components/legal/legal-entity-notice";
import type { MessageKey } from "@/lib/i18n/messages";

const links: { href: string; labelKey: MessageKey }[] = [
  { href: "/legal/terms", labelKey: "legal.terms" },
  { href: "/legal/purchase", labelKey: "legal.mocoPurchaseTerms" },
  { href: "/legal/aup", labelKey: "legal.aup" },
  { href: "/legal/creator-terms", labelKey: "legal.creatorTerms" },
  { href: "/legal/qna", labelKey: "legal.qna" },
  { href: "/legal/sponsored-content", labelKey: "legal.sponsoredContent" },
  { href: "/legal/payment", labelKey: "legal.payment" },
  { href: "/legal/copyright", labelKey: "legal.copyright" },
  { href: "/legal/privacy", labelKey: "legal.privacy" },
  { href: "/legal/account-deletion", labelKey: "legal.accountDeletion" },
  { href: "/legal/policy", labelKey: "legal.policy" },
];

export function LegalFooterLinks({ className = "" }: { className?: string }) {
  const { t } = useLocale();

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4">
        <Link
          href="/contribution-tower"
          className="shrink-0 justify-self-start font-bold text-[#1B3A6B] hover:underline dark:text-[#F5F0E6]"
        >
          {t("wallet.viewContributionTower")}
        </Link>
        <nav className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {links.map((link, i) => (
            <span key={link.href} className="flex items-center gap-3">
              {i > 0 && <span className="text-border">·</span>}
              <Link href={link.href} className="hover:text-primary hover:underline">
                {t(link.labelKey)}
              </Link>
            </span>
          ))}
        </nav>
        <Link
          href="/events/new"
          className="shrink-0 justify-self-end font-serif text-lg font-bold tracking-wide text-[#e8cb8c] hover:text-[#f6e2b4]"
        >
          Ad
        </Link>
      </div>
      <LegalEntityFooterNotice />
    </div>
  );
}
