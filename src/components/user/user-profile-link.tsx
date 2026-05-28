import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 프로필 페이지 — prefetch로 채팅·피드에서 빠른 이동 */
export function UserProfileLink({
  username,
  children,
  className,
}: {
  username: string;
  children: ReactNode;
  className?: string;
}) {
  const slug = username.trim();
  if (!slug) return <>{children}</>;

  return (
    <Link
      href={`/u/${slug}`}
      prefetch
      className={cn("hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm", className)}
    >
      {children}
    </Link>
  );
}
