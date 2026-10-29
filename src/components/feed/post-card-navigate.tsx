"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { topProgress } from "@/lib/top-progress";
import { cn } from "@/lib/utils";

const INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, label, [role='link'], [role='button'], [data-no-nav]";

export function isPostCardNavigateEvent(event: MouseEvent | KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (target.closest(INTERACTIVE_SELECTOR)) return false;
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && selection.toString().trim()) return false;
  return true;
}

export function usePostCardNavigate(href: string) {
  const router = useRouter();

  function openInNewTab() {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function onClick(event: MouseEvent<HTMLElement>) {
    if (!isPostCardNavigateEvent(event)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      openInNewTab();
      return;
    }
    topProgress.start(`router-push ${href}`);
    router.push(href);
  }

  function onAuxClick(event: MouseEvent<HTMLElement>) {
    if (event.button !== 1) return;
    if (!isPostCardNavigateEvent(event)) return;
    event.preventDefault();
    openInNewTab();
  }

  return { onClick, onAuxClick };
}

/** Twitter-style card shell: empty card background opens the post; links/buttons keep their own actions. */
export function PostCardNavigate({
  href,
  className,
  children,
  as: Comp = "article",
}: {
  href: string;
  className?: string;
  children: ReactNode;
  as?: "article" | "div";
}) {
  const { onClick, onAuxClick } = usePostCardNavigate(href);
  return (
    <Comp className={cn("cursor-pointer", className)} onClick={onClick} onAuxClick={onAuxClick}>
      {children}
    </Comp>
  );
}
