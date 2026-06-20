"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { buildAptMailboxUrl } from "@/lib/apt/mailbox-compose-route";
import { cn } from "@/lib/utils";

type AptMailboxLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  communityId?: string;
  initialContent?: string;
  initialTitle?: string;
};

/** 일반 글쓰기 → APT 우편함 배치 화면으로 이동 */
export function AptMailboxLink({
  communityId,
  initialContent,
  initialTitle,
  className,
  children,
  ...props
}: AptMailboxLinkProps) {
  return (
    <Link
      href={buildAptMailboxUrl({ communityId, initialContent, initialTitle })}
      className={cn(className)}
      {...props}
    >
      {children}
    </Link>
  );
}
