"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SidebarAuthFooter() {
  const { data: session } = useSession();
  if (session?.user) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-border/60">
      <p className="text-xs text-muted-foreground px-1">로그인하면 글쓰기·DM·라이브 이용</p>
      <Button asChild className="w-full rounded-xl btn-rainbow">
        <Link href="/auth/signup">회원가입</Link>
      </Button>
      <Button asChild variant="outline" className="w-full rounded-xl">
        <Link href="/auth/signin">로그인</Link>
      </Button>
    </div>
  );
}
