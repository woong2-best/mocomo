"use client";

import { Suspense } from "react";
import { NewMessageCompose } from "@/components/messages/new-message-compose";

export default function MessagesPage() {
  return (
    <div className="hidden md:flex flex-1 flex-col min-h-0">
      <Suspense fallback={<div className="flex-1 min-h-0 animate-pulse bg-muted/15" />}>
        <NewMessageCompose embedded />
      </Suspense>
    </div>
  );
}
