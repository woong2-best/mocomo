import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { COPYRIGHT_POLICY } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_3"),
};

export default async function CopyrightPolicyPage() {
  return (
    <PublishedLegalDocument
      fallback={COPYRIGHT_POLICY}
      supplementalBlocks={[
        { type: "hr" },
        { type: "h2", text: "제9조 (제3자 음성)" },
        {
          type: "p",
          text: "AIRI 라이브의 음성 합성에는 VOICEVOX 엔진의 No.7 화자(Speaker ID 29)를 사용합니다. 출처 표기: Voice by VOICEVOX:No.7",
        },
      ]}
    />
  );
}
