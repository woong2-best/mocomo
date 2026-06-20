"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { buildAptMailboxUrl } from "@/lib/apt/mailbox-compose-route";

/** /compose 링크 호환 — APT 우편함으로 이동 */
export function ComposeRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || status === "loading") return;
    handled.current = true;

    router.replace(
      buildAptMailboxUrl({
        communityId: searchParams.get("community") ?? undefined,
        initialContent: searchParams.get("text") ?? undefined,
        initialTitle: searchParams.get("title") ?? undefined,
      }),
      { scroll: false }
    );
  }, [router, searchParams, status]);

  return null;
}
