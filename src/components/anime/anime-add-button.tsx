"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AnimeAddButton() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  return (
    <Link href="/anime/new">
      <Button className="gap-2">
        <Plus className="h-4 w-4" />
        애니 추가
      </Button>
    </Link>
  );
}
