"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCompose } from "@/components/compose/compose-provider";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

/** /compose 링크 호환 — 피드로 돌아가며 글쓰기 시트 오픈 */
export function ComposeRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { openCompose } = useCompose();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || status === "loading") return;
    handled.current = true;

    openCompose({
      communityId: searchParams.get("community") ?? undefined,
      initialContent: searchParams.get("text") ?? undefined,
      initialTitle: searchParams.get("title") ?? undefined,
    });
    router.replace(DEFAULT_LANDING_PATH, { scroll: false });
  }, [openCompose, router, searchParams, status]);

  return null;
}
