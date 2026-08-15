"use client";

import type { ReactNode } from "react";
import { SensitiveContentGate } from "@/components/media/sensitive-content-gate";

type Props = {
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
  className?: string;
  children: ReactNode;
};

export function SensitiveMediaFrame({
  isNsfw = false,
  isOwner = false,
  viewerShowNsfw = false,
  className,
  children,
}: Props) {
  return (
    <SensitiveContentGate
      isNsfw={isNsfw}
      isOwner={isOwner}
      viewerShowNsfw={viewerShowNsfw}
      className={className}
    >
      {children}
    </SensitiveContentGate>
  );
}
