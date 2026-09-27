"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCompose } from "@/components/compose/compose-provider";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

/** /compose 링크 호환 — 현재 페이지에서 떠 있는 작성 창 오픈 */
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
    const returnPath = searchParams.get("from");
    if (returnPath?.startsWith("/") && !returnPath.startsWith("//")) {
      router.replace(returnPath, { scroll: false });
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace(DEFAULT_LANDING_PATH, { scroll: false });
    }
  }, [openCompose, router, searchParams, status]);

  return null;
}
