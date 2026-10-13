"use client";
import { createTranslator } from "@/lib/i18n/messages";
const i18n = createTranslator("en");


import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LinkifiedText } from "@/components/ui/linkified-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocale } from "@/components/providers/locale-provider";
import { userDisplayName } from "@/lib/user-public-select";
import { reelCollabStack } from "@/lib/reels/collaborators";
import type { ReelAuthor } from "@/lib/reels/types";

export function buildVideoCaptionText(
  title: string | null | undefined,
  content: string
): string {
  return [title?.trim(), content.trim()].filter(Boolean).join("\n");
}

type Props = {
  username: string;
  /** Author avatar — shown before the nickname at bottom meta */
  authorImage?: string | null;
  authorName?: string | null;
  authorId?: string;
  collaborators?: ReelAuthor[] | null;
  title?: string | null;
  content: string;
  /** Extra content below caption (e.g. multi-video index). */
  footer?: React.ReactNode;
  className?: string;
};

export function VideoOverlayCaption({
  username,
  authorImage,
  authorName,
  authorId,
  collaborators,
  title,
  content,
  footer,
  className,
}: Props) {
  const { t } = useLocale();
  const captionId = useId();
  const captionRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [truncatable, setTruncatable] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);

  const captionText = buildVideoCaptionText(title, content);
  const hasCaption = captionText.length > 0;

  const author = useMemo<ReelAuthor>(
    () => ({
      id: authorId || username,
      username,
      name: authorName ?? null,
      image: authorImage ?? null,
    }),
    [authorId, authorImage, authorName, username]
  );

  const others = useMemo(
    () =>
      (collaborators ?? []).filter(
        (u) => u.id && u.id !== author.id && u.username !== author.username
      ),
    [author.id, author.username, collaborators]
  );
  const hasCollab = others.length > 0;
  const stackUsers = hasCollab ? reelCollabStack(author, others) : [author];
  const firstOther = others[0];
  const extraCount = Math.max(0, others.length - 1);
  const roster = hasCollab ? [author, ...others] : [];
  const nickname = userDisplayName(author);

  useEffect(() => {
    setExpanded(false);
    setRosterOpen(false);
  }, [captionText, author.id]);

  useEffect(() => {
    const el = captionRef.current;
    if (!el || expanded || !hasCaption) {
      setTruncatable(false);
      return;
    }
    const check = () => {
      setTruncatable(
        el.scrollHeight > el.clientHeight + 1 ||
          captionText.includes("\n") ||
          captionText.length > 48
      );
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [captionText, expanded, hasCaption]);

  const toggle = useCallback(() => {
    if (!hasCaption || (!expanded && !truncatable)) return;
    setExpanded((prev) => !prev);
  }, [expanded, hasCaption, truncatable]);

  const collapse = useCallback(() => setExpanded(false), []);

  const closeRoster = useCallback(() => setRosterOpen(false), []);

  const avatarStack = (
    <span className="relative flex shrink-0">
      {stackUsers.map((u, i) => (
        <Avatar
          key={u.id}
          className={cn(
            "h-9 w-9 ring-2 ring-white/90 ring-offset-0",
            i > 0 && "-ml-2.5"
          )}
          style={{ zIndex: stackUsers.length - i }}
        >
          <AvatarImage src={u.image ?? undefined} alt={userDisplayName(u)} />
          <AvatarFallback className="text-xs">
            {userDisplayName(u).slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
    </span>
  );

  const nameBlock = hasCollab && firstOther ? (
    <span className="min-w-0 leading-snug">
      <span className="block truncate font-display text-sm font-bold drop-shadow">
        {t("collab.headerAuthorWith", { name: nickname })}
      </span>
      <span className="block truncate font-display text-sm font-bold drop-shadow">
        {extraCount > 0
          ? t("collab.headerOthersMore", {
              name: userDisplayName(firstOther),
              count: String(extraCount),
            })
          : t("collab.headerOther", { name: userDisplayName(firstOther) })}
      </span>
    </span>
  ) : (
    <span className="truncate font-display text-sm font-bold drop-shadow">{nickname}</span>
  );

  return (
    <>
      {expanded ? (
        <button
          type="button"
          className="pointer-events-auto absolute inset-0 z-[9] bg-black/35"
          aria-label={i18n("reels.s1wezsxw")}
          onClick={collapse}
        />
      ) : null}

      {rosterOpen && hasCollab ? (
        <>
          <button
            type="button"
            className="pointer-events-auto absolute inset-0 z-[11] bg-black/40"
            aria-label={i18n("reels.s1wezsxw")}
            onClick={(e) => {
              e.stopPropagation();
              closeRoster();
            }}
          />
          <div
            className="pointer-events-auto absolute inset-x-3 z-[12] rounded-2xl border border-white/15 bg-black/75 p-2 shadow-xl backdrop-blur-md"
            style={{ top: "max(3.5rem, calc(env(safe-area-inset-top) + 2.75rem))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
              {t("collab.rosterTitle")}
            </p>
            <ul className="max-h-[min(46vh,20rem)] space-y-0.5 overflow-y-auto">
              {roster.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/u/${u.username}`}
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-white hover:bg-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Avatar className="h-8 w-8 ring-1 ring-white/40">
                      <AvatarImage src={u.image ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px]">
                        {userDisplayName(u).slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-semibold">
                      {userDisplayName(u)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t transition-[padding] duration-300",
          expanded
            ? "from-black/90 via-black/55 to-transparent pt-[min(52vh,28rem)]"
            : "from-black/75 via-black/25 to-transparent pt-24",
          "pb-10",
          className
        )}
      >
        <div className="pointer-events-auto flex items-end justify-between gap-3 px-4 pr-16">
          <div className="relative z-10 min-w-0 max-w-[78%] space-y-1 text-white">
            {hasCollab ? (
              <button
                type="button"
                className="inline-flex max-w-full items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                onClick={(e) => {
                  e.stopPropagation();
                  setRosterOpen((open) => !open);
                }}
                aria-expanded={rosterOpen}
                aria-label={t("collab.rosterTitle")}
              >
                {avatarStack}
                {nameBlock}
              </button>
            ) : (
              <Link
                href={`/u/${username}`}
                className="inline-flex max-w-full items-center gap-2 rounded font-display text-sm font-bold drop-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                onClick={(e) => e.stopPropagation()}
              >
                {avatarStack}
                {nameBlock}
              </Link>
            )}

            {hasCaption ? (
              <button
                type="button"
                id={captionId}
                aria-expanded={expanded}
                aria-label={expanded ? i18n("reels.s1wf3efy") : i18n("reels.s1p5jsnp")}
                onClick={toggle}
                className="block w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <div
                  ref={captionRef}
                  className={cn(
                    "text-sm leading-snug text-white/95 drop-shadow whitespace-pre-wrap break-words",
                    "[&_a]:text-sky-200 [&_a:hover]:underline",
                    expanded
                      ? "max-h-[min(42vh,20rem)] overflow-y-auto overscroll-contain pr-1"
                      : "line-clamp-1"
                  )}
                >
                  <LinkifiedText text={captionText} as="span" stopPropagation />
                </div>
                {!expanded && truncatable ? (
                  <span className="sr-only">{i18n("reels.sd4f4ci")}</span>
                ) : null}
              </button>
            ) : null}

            {footer}
          </div>
        </div>
      </div>
    </>
  );
}
