"use client";

import type { ComponentProps } from "react";
import { useCompose } from "@/components/compose/compose-provider";
import { cn } from "@/lib/utils";

export function ComposeOpenButton({
  communityId,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { communityId?: string }) {
  const { openCompose } = useCompose();

  return (
    <button
      type="button"
      className={cn(className)}
      onClick={() => openCompose({ communityId })}
      {...props}
    >
      {children}
    </button>
  );
}
