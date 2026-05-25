"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AuthTopBanner() {
  const { data: session } = useSession();
  if (session?.user) return null;

  return (
    <div className="sticky top-14 z-40 lg:hidden border-b border-primary/20 bg-gradient-to-r from-violet-600 to-pink-600 text-white px-4 py-2.5 flex items-center justify-between gap-2">
      <p className="text-sm font-medium truncate">가입하고 서브컬처 시작!</p>
      <div className="flex gap-2 shrink-0">
        <Button asChild size="sm" variant="secondary" className="h-8 rounded-lg text-xs">
          <Link href="/auth/signin">로그인</Link>
        </Button>
        <Button asChild size="sm" className="h-8 rounded-lg text-xs bg-white text-violet-700 hover:bg-white/90">
          <Link href="/auth/signup">가입</Link>
        </Button>
      </div>
    </div>
  );
}
