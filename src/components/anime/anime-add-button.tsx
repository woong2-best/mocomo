"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AnimeAddButton() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <Link href="/auth/signin?callbackUrl=/anime/new">
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          로그인하고 문서 추가
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/anime/new">
      <Button className="gap-2">
        <Plus className="h-4 w-4" />
        새 문서 추가
      </Button>
    </Link>
  );
}
