"use client";

import { Search } from "lucide-react";

export function AnimeHubSearch() {
  return (
    <form action="/search" className="relative w-full" role="search">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        name="q"
        type="search"
        placeholder="애니 글·게시글 검색 (제목·내용)"
        className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1e88e5]/40"
        autoComplete="off"
      />
    </form>
  );
}
