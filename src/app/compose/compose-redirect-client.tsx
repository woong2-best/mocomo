"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCompose } from "@/components/compose/compose-provider";

/** /compose 링크 호환 — 현재 페이지에서 바텀시트만 열기 (불필요한 전체 새로고침 방지) */
export function ComposeRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { openCompose } = useCompose();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || status === "loading") return;
    handled.current = true;

    const community = searchParams.get("community") ?? undefined;
    openCompose({ communityId: community });

    const from = searchParams.get("from");
    const target = from && from.startsWith("/") ? from : "/";
    if (window.location.pathname === "/compose") {
      router.replace(target, { scroll: false });
    }
  }, [openCompose, router, searchParams, status]);

  return null;
}
