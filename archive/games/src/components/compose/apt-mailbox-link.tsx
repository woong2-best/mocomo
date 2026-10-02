"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { buildAptMailboxUrl } from "@/lib/apt/mailbox-compose-route";
import { isAptPublicEnabled } from "@/lib/apt-public-gate";
import { cn } from "@/lib/utils";

type AptMailboxLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  communityId?: string;
  initialContent?: string;
  initialTitle?: string;
};

/** APT 우편함(인게임) 배치 화면으로 이동 — APT 보류 시 렌더하지 않음 */
export function AptMailboxLink({
  communityId,
  initialContent,
  initialTitle,
  className,
  children,
  ...props
}: AptMailboxLinkProps) {
  if (!isAptPublicEnabled()) return null;

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
