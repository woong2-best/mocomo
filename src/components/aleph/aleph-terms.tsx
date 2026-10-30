import {
  ALEPH_TERMS_INTRO,
  ALEPH_TERMS_PROVIDER,
  ALEPH_TERMS_SECTIONS,
  ALEPH_TERMS_UPDATED,
} from "@/lib/aleph-terms";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

export function AlephTerms() {
  return (
    <article className="terms">
      <p className="terms-meta">
        {t("aleph.termsUpdated")} {ALEPH_TERMS_UPDATED}
        <br />
        {t("aleph.termsProvider")} {ALEPH_TERMS_PROVIDER}
      </p>
      <p>{ALEPH_TERMS_INTRO}</p>
      {ALEPH_TERMS_SECTIONS.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.items?.map((item) => (
            <p key={item.title}>
              <strong>{item.title}: </strong>
              {item.body}
            </p>
          ))}
          {section.note ? <p className="terms-note">{section.note}</p> : null}
        </section>
      ))}
    </article>
  );
}
