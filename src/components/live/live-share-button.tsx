"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LiveShareButton({ channelId }: { channelId: string }) {
  const [copied, setCopied] = useState(false);

  function share() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/voice/${channelId}`
        : `/voice/${channelId}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="outline" size="sm" className="rounded-lg gap-1 h-8 text-xs" onClick={share}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "복사됨" : "공유"}
    </Button>
  );
}
