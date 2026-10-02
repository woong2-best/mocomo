import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { Suspense } from "react";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { QnaHubClient } from "@/components/communities/qna-hub-client";
import { CommunitiesHubSkeleton } from "@/components/ui/content-skeletons";

export const revalidate = 60;

export const metadata = {
  title: "QnA",
  description: t("app.communities.qna"),
};

export default function CommunitiesPage() {
  return (
    <AppPageChrome maxWidth="5xl">
      <Suspense fallback={<CommunitiesHubSkeleton />}>
        <QnaHubClient />
      </Suspense>
    </AppPageChrome>
  );
}
