import { Suspense } from "react";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { QnaHubClient } from "@/components/communities/qna-hub-client";
import { CommunitiesHubSkeleton } from "@/components/ui/content-skeletons";

export const revalidate = 60;

export const metadata = {
  title: "QnA",
  description: "카테고리별 QnA — 최신 글부터",
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
