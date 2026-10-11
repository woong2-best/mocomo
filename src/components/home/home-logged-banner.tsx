"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComposeForm } from "@/components/compose/compose-form";
import { FEED_INLINE_COMPOSE_ID } from "@/lib/compose-inline";
import { safeRouterRefresh } from "@/lib/feed-overlay-guard";
import { scrollMainToTop } from "@/lib/scroll-main";

export function HomeLoggedBanner() {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);

  return (
    <div
      id={FEED_INLINE_COMPOSE_ID}
      className="border-b border-border/60 bg-background px-4 py-3 sm:px-5 sm:py-4 scroll-mt-16"
    >
      <ComposeForm
        key={formKey}
        variant="inline"
        onPosted={() => {
          setFormKey((k) => k + 1);
          scrollMainToTop();
          safeRouterRefresh(() => router.refresh());
        }}
      />
    </div>
  );
}
