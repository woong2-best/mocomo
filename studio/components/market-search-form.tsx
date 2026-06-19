"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function MarketSearchForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams(sp.toString());
        if (q.trim()) params.set("q", q.trim());
        else params.delete("q");
        router.push(`/studio/market?${params.toString()}`);
      }}
    >
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="이름·태그 검색"
        className="max-w-xs"
      />
      <Button type="submit" variant="outline" size="sm">
        검색
      </Button>
    </form>
  );
}
