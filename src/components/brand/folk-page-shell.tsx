"use client";

import { FolkArtStage, FolkBrushDivider } from "@/components/brand/folk-decor";
import { cn } from "@/lib/utils";

export function FolkPageShell({
  children,
  className,
  maxWidth = "5xl",
  dense,
  showDivider,
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "3xl" | "4xl" | "5xl" | "6xl" | "full";
  dense?: boolean;
  showDivider?: boolean;
}) {
  const maxClass = {
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    full: "max-w-full",
  }[maxWidth];

  return (
    <FolkArtStage dense={dense} className={cn("p-4 lg:p-6 mx-auto", maxClass, className)}>
      {showDivider && <FolkBrushDivider className="mb-4 opacity-60" />}
      {children}
    </FolkArtStage>
  );
}
