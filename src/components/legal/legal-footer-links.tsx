"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";

const links: { href: string; labelKey: MessageKey }[] = [
  { href: "/legal/terms", labelKey: "legal.terms" },
  { href: "/legal/creator-terms", labelKey: "legal.creatorTerms" },
  { href: "/legal/payment", labelKey: "legal.payment" },
  { href: "/legal/copyright", labelKey: "legal.copyright" },
  { href: "/legal/privacy", labelKey: "legal.privacy" },
  { href: "/legal/account-deletion", labelKey: "legal.accountDeletion" },
  { href: "/legal/policy", labelKey: "legal.policy" },
];

export function LegalFooterLinks({ className = "" }: { className?: string }) {
  const { t } = useLocale();

  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground ${className}`}
    >
      {links.map((link, i) => (
        <span key={link.href} className="flex items-center gap-3">
          {i > 0 && <span className="text-border">·</span>}
          <Link href={link.href} className="hover:text-primary hover:underline">
            {t(link.labelKey)}
          </Link>
        </span>
      ))}
    </nav>
  );
}
