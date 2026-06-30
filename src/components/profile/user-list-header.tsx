"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NativePageTitle } from "@/components/layout/app-page-chrome";

export function UserListStickyHeader({
  username,
  title,
}: {
  username: string;
  title: string;
}) {
  return (
    <div className="sticky top-14 z-20 flex items-center gap-4 px-4 py-3 bg-background/90 backdrop-blur border-b border-border/60">
      <Link href={`/u/${username}`} className="p-2 -ml-2 rounded-full hover:bg-muted/80">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div>
        <NativePageTitle>
          <h1 className="font-bold">{title}</h1>
        </NativePageTitle>
        <p className="text-sm text-muted-foreground">@{username}</p>
      </div>
    </div>
  );
}
