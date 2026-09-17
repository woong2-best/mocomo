"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveR18Gate } from "@/hooks/use-live-r18-gate";
import { LiveR18BlockedDialog } from "@/components/live/live-r18-blocked-dialog";
import { isR18LiveCategory } from "@/lib/live-categories";

/** Blocks direct `/live?category=LIVE` for underage / logged-out users. */
export function LiveR18DeepLinkGuard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = searchParams.get("category");
  const { blockedOpen, setBlockedOpen, ensureR18Access } = useLiveR18Gate();
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isR18LiveCategory(category)) {
      checkedRef.current = null;
      return;
    }
    if (checkedRef.current === category) return;
    checkedRef.current = category;

    void (async () => {
      const ok = await ensureR18Access();
      if (!ok) {
        router.replace("/live", { scroll: false });
      }
    })();
  }, [category, ensureR18Access, router]);

  return <LiveR18BlockedDialog open={blockedOpen} onOpenChange={setBlockedOpen} />;
}
