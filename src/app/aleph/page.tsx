import type { Metadata } from "next";
import Link from "next/link";
import { AlephTerms } from "@/components/aleph/aleph-terms";
import { AlephTicketCopy } from "@/components/aleph/aleph-ticket-copy";
import { ALEPH_HEADLINE, ALEPH_TITLE, ALEPH_VERSION_LABEL } from "@/lib/aleph-ticket";
import { createTranslator } from "@/lib/i18n/messages";
import "./aleph-landing.css";

const t = createTranslator("en");

export const metadata: Metadata = {
  title: ALEPH_TITLE,
  robots: { index: false, follow: false },
};

export default function AlephTicketPage() {
  return (
    <main className="aleph-landing">
      <div className="aleph-landing-bg" aria-hidden="true" />

      <header>
        <Link href="/">{t("aleph.headerBrand")}</Link>
        <span>{ALEPH_VERSION_LABEL}</span>
      </header>

      <div className="shell">
        <section className="hero">
          <img className="product-icon" src="/images/aleph-mascot.png" alt="" />
          <h1>{ALEPH_HEADLINE}</h1>
          <AlephTicketCopy />
        </section>

        <details className="terms-fold">
          <summary className="mono">{t("aleph.termsTitle")}</summary>
          <AlephTerms />
        </details>
      </div>
    </main>
  );
}
