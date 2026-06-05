"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompose } from "@/components/compose/compose-provider";

/** /compose 링크 호환 — 홈으로 돌아가며 바텀시트 오픈 */
export function ComposeRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openCompose } = useCompose();

  useEffect(() => {
    const community = searchParams.get("community") ?? undefined;
    openCompose({ communityId: community });
    router.replace("/");
  }, [openCompose, router, searchParams]);

  return null;
}
