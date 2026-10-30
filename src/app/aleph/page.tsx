import type { Metadata } from "next";
import Link from "next/link";
import { AlephTerms } from "@/components/aleph/aleph-terms";
import { AlephTicketCopy } from "@/components/aleph/aleph-ticket-copy";
import { ALEPH_TITLE, ALEPH_VERSION_LABEL } from "@/lib/aleph-ticket";
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
          <div className="product">
            <img className="product-icon" src="/images/aleph-mascot.png" alt="" />
            <div className="product-meta">
              <h1>
                MoCoMo <span>× Aleph</span>
              </h1>
              <div className="product-version">{ALEPH_VERSION_LABEL}</div>
              <div className="product-publisher">{t("aleph.publisher")}</div>
              <div className="product-chip">{t("aleph.badgeProtocol")}</div>
            </div>
          </div>
          <p className="hero-sub">{t("aleph.heroSub")}</p>
          <p className="hero-copy">{t("aleph.heroCopy")}</p>
        </section>

        <div className="spine">
          <section className="section">
            <div className="section-head">
              <div className="section-index">01</div>
              <h2>{t("aleph.archTitle")}</h2>
            </div>
            <div className="stack">
              <div className="row">
                <div className="row-label">{t("aleph.archHumanLabel")}</div>
                <p>{t("aleph.archHumanCopy")}</p>
              </div>
              <div className="row">
                <div className="row-label">{t("aleph.archAlephLabel")}</div>
                <p>{t("aleph.archAlephCopy")}</p>
              </div>
              <div className="row">
                <div className="row-label">{t("aleph.archOneLabel")}</div>
                <p>{t("aleph.archOneCopy")}</p>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <div className="section-index">02</div>
              <h2>{t("aleph.specTitle")}</h2>
            </div>
            <div className="stack">
              <div className="row">
                <div className="spec-key">{t("aleph.specProtocolKey")}</div>
                <div className="spec-val">{t("aleph.specProtocolVal")}</div>
              </div>
              <div className="row">
                <div className="spec-key">{t("aleph.specVectorKey")}</div>
                <div className="spec-val">{t("aleph.specVectorVal")}</div>
              </div>
              <div className="row">
                <div className="spec-key">{t("aleph.specTransportKey")}</div>
                <div className="spec-val">{t("aleph.specTransportVal")}</div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <div className="section-index">03</div>
              <h2>{t("aleph.sigTitle")}</h2>
            </div>
            <AlephTicketCopy />
          </section>

          <section className="section">
            <div className="section-head">
              <div className="section-index">04</div>
              <h2>{t("aleph.termsTitle")}</h2>
            </div>
            <AlephTerms />
          </section>
        </div>
      </div>
    </main>
  );
}
