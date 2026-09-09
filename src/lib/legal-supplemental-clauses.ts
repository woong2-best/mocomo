import type { LegalBlock } from "@/lib/legal-content";
import termsSupplemental from "../../content/legal/terms-supplemental.json";

export const TERMS_SUPPLEMENTAL_VERSION = termsSupplemental.version;

type LocalizedText = Record<string, string>;
type LocalizedParagraphs = Record<string, string[]>;

type SupplementalSection = {
  heading: LocalizedText;
  paragraphs: LocalizedParagraphs;
};

type TermsSupplementalConfig = {
  version: string;
  sections: Record<string, SupplementalSection>;
};

const config = termsSupplemental as TermsSupplementalConfig;

function resolveLocalizedText(map: LocalizedText, countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  return map[code] ?? map.default ?? Object.values(map)[0] ?? "";
}

function resolveLocalizedParagraphs(map: LocalizedParagraphs, countryCode: string): string[] {
  const code = countryCode.trim().toUpperCase();
  return map[code] ?? map.default ?? Object.values(map)[0] ?? [];
}

/** Country-specific supplemental ToS blocks (CMS/JSON — not hardcoded in page). */
export function getTermsSupplementalBlocks(countryCode: string): LegalBlock[] {
  const blocks: LegalBlock[] = [{ type: "hr" }];

  for (const section of Object.values(config.sections)) {
    const heading = resolveLocalizedText(section.heading, countryCode);
    if (heading) {
      blocks.push({ type: "h2", text: heading });
    }
    for (const paragraph of resolveLocalizedParagraphs(section.paragraphs, countryCode)) {
      if (paragraph.trim()) {
        blocks.push({ type: "p", text: paragraph });
      }
    }
  }

  return blocks;
}
