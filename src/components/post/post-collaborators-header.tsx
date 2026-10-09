"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import type { SupportTierLevel } from "@prisma/client";
import { useLocale } from "@/components/providers/locale-provider";
import { ANONYMOUS_AUTHOR_USERNAME, ANONYMOUS_DISPLAY_NAME } from "@/lib/anonymous-post";
import { cn } from "@/lib/utils";
import { QnaQuestionMark } from "@/components/post/qna-question-mark";

export type CollabHeaderUser = {
  id: string;
  username: string;
  name?: string | null;
  image: string | null;
  supportTierSent?: SupportTierLevel;
};

export type CollabHeaderEntry = {
  id?: string;
  userId?: string;
  status?: string;
  user: CollabHeaderUser;
};

type Props = {
  author: CollabHeaderUser;
  collaborators?: CollabHeaderEntry[] | null;
  /** Optional trailing meta (time, etc.) */
  trailing?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
  /** 커뮤니티 갤러리 — 닉네임 옆에 (아이디) */
  showIdHandle?: boolean;
  anonymous?: boolean;
  /** QnA/community post — cobalt Q mark instead of avatar; hide author row */
  qna?: boolean;
};

const ROSTER_GAP = 8;
const ROSTER_MARGIN = 8;

/**
 * Collaborator list floats beside the "name and … others" label.
 * Portaled to document.body so short cards with overflow:hidden cannot clip it.
 */
function CollabRosterFlyout({
  open,
  anchorRef,
  users,
  onEnter,
  onLeave,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  users: CollabHeaderUser[];
  onEnter: () => void;
  onLeave: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; side: "left" | "right" } | null>(null);
  const rosterKey = users.map((u) => u.id).join("\0");

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    const update = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const rect = anchor.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      let left = rect.right + ROSTER_GAP;
      let side: "left" | "right" = "right";
      if (left + width > window.innerWidth - ROSTER_MARGIN) {
        side = "left";
        left = rect.left - ROSTER_GAP - width;
      }
      left = Math.max(ROSTER_MARGIN, Math.min(left, window.innerWidth - width - ROSTER_MARGIN));
      let top = rect.top + (rect.height - height) / 2;
      top = Math.max(ROSTER_MARGIN, Math.min(top, window.innerHeight - height - ROSTER_MARGIN));
      setPos((prev) =>
        prev && prev.top === top && prev.left === left && prev.side === side ? prev : { top, left, side }
      );
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, rosterKey]);

  if (!open || typeof document === "undefined") return null;

  const side = pos?.side ?? "right";

  return createPortal(
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      data-collab-roster=""
      className="fixed z-[260]"
      style={{
        top: pos?.top ?? 0,
        left: pos ? (side === "right" ? pos.left - ROSTER_GAP : pos.left) : 0,
        paddingLeft: side === "right" ? ROSTER_GAP : 0,
        paddingRight: side === "left" ? ROSTER_GAP : 0,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <div
        ref={panelRef}
        className="max-h-[min(70vh,360px)] min-w-[200px] max-w-[280px] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl"
      >
        <ul className="space-y-1">
          {users.map((u) => (
            <li key={u.id}>
              <Link
                href={`/u/${u.username}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={u.image ?? undefined} alt="" />
                  <AvatarFallback className="text-[9px]">
                    {userDisplayName(u)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{userDisplayName(u)}</span>
                <span className="truncate text-xs text-muted-foreground">@{u.username}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}

/**
 * Instagram-style collab header: stacked avatars + "A님과 B님".
 * Site theme (light/dark) via existing tokens — not IG black chrome.
 */
export function PostCollaboratorsHeader({
  author,
  collaborators,
  trailing,
  size = "sm",
  className,
  showIdHandle = false,
  anonymous = false,
  qna = false,
}: Props) {
  const { t } = useLocale();
  const namesRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);

  const showRoster = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setRosterOpen(true);
  };

  const hideRoster = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setRosterOpen(false), 160);
  };

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!rosterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setRosterOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rosterOpen]);

  if (qna) {
    return (
      <div className={cn("flex items-start gap-2.5 min-w-0", className)}>
        <QnaQuestionMark size={size} />
        {trailing ? (
          <div className="min-w-0 flex-1 text-xs text-muted-foreground pt-0.5">{trailing}</div>
        ) : null}
      </div>
    );
  }

  const displayAnonymous = anonymous || author.username === ANONYMOUS_AUTHOR_USERNAME;
  const others = displayAnonymous
    ? []
    : (collaborators ?? [])
        .map((c) => c.user)
        .filter((u): u is CollabHeaderUser => !!u?.id && u.id !== author.id);

  const hasCollab = others.length > 0;
  const stackSize = size === "md" ? "h-10 w-10" : "h-10 w-10";
  const stackOverlap = size === "md" ? "h-9 w-9" : "h-8 w-8";
  const maxStack = 3;
  const stackUsers = hasCollab
    ? [author, ...others].slice(0, maxStack)
    : [author];
  const firstOther = others[0];
  const extraCount = Math.max(0, others.length - 1);
  const roster = hasCollab ? [author, ...others] : [];

  return (
    <div
      data-collab-header={hasCollab ? "" : undefined}
      className={cn("flex items-start gap-2.5 min-w-0", className)}
      onMouseEnter={hasCollab ? showRoster : undefined}
      onMouseLeave={hasCollab ? hideRoster : undefined}
      onFocus={hasCollab ? showRoster : undefined}
      onBlur={
        hasCollab
          ? (e) => {
              const next = e.relatedTarget;
              const roster = document.querySelector("[data-collab-roster]");
              if (next instanceof Node && (e.currentTarget.contains(next) || roster?.contains(next))) return;
              hideRoster();
            }
          : undefined
      }
    >
      <div className="relative flex shrink-0">
        {stackUsers.map((u, i) => {
          const avatar = (
            <Avatar
              className={cn(
                hasCollab ? stackOverlap : stackSize,
                "border border-border/50"
              )}
            >
              <AvatarImage src={displayAnonymous ? undefined : u.image ?? undefined} alt="" />
              <AvatarFallback className="text-[11px] font-semibold">
                {displayAnonymous ? "?" : userDisplayName(u)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          );
          if (displayAnonymous) {
            return (
              <span
                key={u.id}
                className={cn("relative rounded-full ring-2 ring-background", hasCollab ? stackOverlap : stackSize)}
                title={ANONYMOUS_DISPLAY_NAME}
              >
                {avatar}
              </span>
            );
          }
          return (
            <Link
              key={u.id}
              href={`/u/${u.username}`}
              className={cn(
                "relative rounded-full ring-2 ring-background",
                hasCollab ? stackOverlap : stackSize,
                i > 0 && "-ml-2.5"
              )}
              style={{ zIndex: stackUsers.length - i }}
              title={hasCollab ? undefined : userDisplayName(u)}
            >
              {avatar}
            </Link>
          );
        })}
      </div>

      <div className="min-w-0 flex-1">
        {hasCollab && firstOther ? (
          <div className="min-w-0 leading-snug">
            <div ref={namesRef} className="inline-block max-w-full min-w-0 align-top">
              <p className="text-[15px] font-semibold truncate">
              <Link
                href={`/u/${author.username}`}
                className="hover:underline"
              >
                {t("collab.headerAuthorWith", {
                  name: userDisplayName(author),
                })}
              </Link>
            </p>
            <p className="text-[15px] font-semibold truncate">
              <Link
                href={`/u/${firstOther.username}`}
                className="hover:underline"
              >
                {extraCount > 0
                  ? t("collab.headerOthersMore", {
                      name: userDisplayName(firstOther),
                      count: String(extraCount),
                    })
                  : t("collab.headerOther", {
                      name: userDisplayName(firstOther),
                    })}
              </Link>
              </p>
            </div>
            {trailing ? (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                {trailing}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-wrap text-sm min-w-0">
            {displayAnonymous ? (
              <span className="font-bold text-foreground">{ANONYMOUS_DISPLAY_NAME}</span>
            ) : (
              <Link href={`/u/${author.username}`} className="hover:underline min-w-0">
                <DisplayNameWithSupportTier
                  name={userDisplayName(author)}
                  tier={author.supportTierSent ?? "SEED"}
                  nameClassName="font-bold"
                  compact
                  idHandle={showIdHandle ? author.username : undefined}
                />
              </Link>
            )}
            {trailing}
          </div>
        )}
      </div>
      {hasCollab ? (
        <CollabRosterFlyout
          open={rosterOpen}
          anchorRef={namesRef}
          users={roster}
          onEnter={showRoster}
          onLeave={hideRoster}
        />
      ) : null}
    </div>
  );
}
