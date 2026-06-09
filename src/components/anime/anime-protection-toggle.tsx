"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleAnimeProtection } from "@/actions/anime";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff } from "lucide-react";

export function AnimeProtectionToggle({ slug, isProtected }: { slug: string; isProtected: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [protectedState, setProtectedState] = useState(isProtected);

  async function toggle() {
    setLoading(true);
    const next = !protectedState;
    const res = await toggleAnimeProtection(slug, next);
    setLoading(false);
    if ("anime" in res && res.anime) {
      setProtectedState(next);
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={protectedState ? "default" : "outline"}
      className="rounded-lg gap-1"
      disabled={loading}
      onClick={() => void toggle()}
    >
      {protectedState ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
      {loading ? "처리 중…" : protectedState ? "보호됨 (운영진만 편집)" : "문서 보호 켜기"}
    </Button>
  );
}
