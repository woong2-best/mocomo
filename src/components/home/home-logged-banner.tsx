"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ComposeForm } from "@/components/compose/compose-form";
import { useCompose } from "@/components/compose/compose-provider";
import { FEED_INLINE_COMPOSE_ID } from "@/lib/compose-inline";
import { safeRouterRefresh } from "@/lib/feed-overlay-guard";

export function HomeLoggedBanner() {
  const router = useRouter();
  const { feedInlineCompose } = useCompose();
  const [formKey, setFormKey] = useState(0);
  const draftKey = feedInlineCompose?.key ?? formKey;

  return (
    <div
      id={FEED_INLINE_COMPOSE_ID}
      className="border-b border-border/60 bg-background px-4 py-3 sm:px-5 sm:py-4 scroll-mt-16"
    >
      <ComposeForm
        key={draftKey}
        variant="inline"
        initialContent={feedInlineCompose?.initialContent}
        initialTitle={feedInlineCompose?.initialTitle}
        onPosted={() => {
          setFormKey((k) => k + 1);
          safeRouterRefresh(() => router.refresh());
        }}
      />
    </div>
  );
}
