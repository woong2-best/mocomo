"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SidebarAuthFooter() {
  const { data: session, status } = useSession();
  if (status === "loading" || session?.user) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-border/60">
      <p className="text-xs text-muted-foreground px-1">로그인하면 글쓰기·DM·라이브 이용</p>
      <Link href="/auth/signup" className="block">
        <Button className="w-full rounded-xl btn-rainbow">회원가입</Button>
      </Link>
      <Link href="/auth/signin" className="block">
        <Button variant="outline" className="w-full rounded-xl">
          로그인
        </Button>
      </Link>
    </div>
  );
}
