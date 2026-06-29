"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export function AdminPageChrome({
  children,
  maxWidth = "5xl",
  backHref = "/admin",
  backLabel = "관리자 패널",
  title,
}: {
  children: React.ReactNode;
  maxWidth?: "lg" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
  backHref?: string;
  backLabel?: string;
  title?: React.ReactNode;
}) {
  return (
    <AppPageChrome maxWidth={maxWidth} spacing="sm">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      {title}
      {children}
    </AppPageChrome>
  );
}
