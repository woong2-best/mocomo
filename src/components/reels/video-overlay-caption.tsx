"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LinkifiedText } from "@/components/ui/linkified-text";

export function buildVideoCaptionText(
  title: string | null | undefined,
  content: string
): string {
  return [title?.trim(), content.trim()].filter(Boolean).join("\n");
}

type Props = {
  username: string;
  title?: string | null;
  content: string;
  /** Extra content below caption (e.g. multi-video index). */
  footer?: React.ReactNode;
  className?: string;
};

export function VideoOverlayCaption({
  username,
  title,
  content,
  footer,
  className,
}: Props) {
  const captionId = useId();
  const captionRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [truncatable, setTruncatable] = useState(false);

  const captionText = buildVideoCaptionText(title, content);
  const hasCaption = captionText.length > 0;

  useEffect(() => {
    setExpanded(false);
  }, [captionText]);

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

  return (
    <>
      {expanded ? (
        <button
          type="button"
          className="pointer-events-auto absolute inset-0 z-[9] bg-black/35"
          aria-label="설명 닫기"
          onClick={collapse}
        />
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
            <Link
              href={`/u/${username}`}
              className="inline-block rounded font-display text-sm font-bold drop-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              onClick={(e) => e.stopPropagation()}
            >
              @{username}
            </Link>

            {hasCaption ? (
              <button
                type="button"
                id={captionId}
                aria-expanded={expanded}
                aria-label={expanded ? "설명 접기" : "설명 펼치기"}
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
                  <span className="sr-only">… 더 보기</span>
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
