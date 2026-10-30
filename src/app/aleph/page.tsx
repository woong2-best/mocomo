import type { Metadata } from "next";
import Link from "next/link";
import { AlephTicketCopy } from "@/components/aleph/aleph-ticket-copy";
import { ALEPH_TITLE } from "@/lib/aleph-ticket";
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
        <span>{t("aleph.headerMeta")}</span>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow">{t("aleph.eyebrow")}</div>
          <h1>
            {t("aleph.heroTitle")}
            <br />
            <span>{t("aleph.heroTitleMark")}</span>
          </h1>
          <p className="hero-copy">{t("aleph.heroCopy")}</p>
          <div className="scroll-hint">{t("aleph.scrollHint")}</div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-grid">
          <div className="number">{t("aleph.s01Number")}</div>
          <div className="info-content">
            <h2>{t("aleph.s01Title")}</h2>
            <p className="info-copy">{t("aleph.s01Copy")}</p>
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-grid">
          <div className="number">{t("aleph.s02Number")}</div>
          <div className="info-content">
            <h2>{t("aleph.s02Title")}</h2>
            <p className="info-copy">{t("aleph.s02Copy")}</p>
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-grid">
          <div className="number">{t("aleph.s03Number")}</div>
          <div className="info-content">
            <h2>{t("aleph.s03Title")}</h2>
            <p className="info-copy">{t("aleph.s03Copy")}</p>
          </div>
        </div>
      </section>

      <section>
        <AlephTicketCopy />
      </section>
    </main>
  );
}
