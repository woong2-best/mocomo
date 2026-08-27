"use client";

import { MessageSquare } from "lucide-react";

export function PostsChannelHeader() {
  return (
    <header className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center gap-3">
      <h1 className="font-semibold flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        게시글
      </h1>
    </header>
  );
}
