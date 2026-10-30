"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { MentionHoverLink } from "@/components/user/mention-hover-card";
import {
  hashtagSearchHref,
  isExternalHref,
  mentionProfileHref,
  parseLinkifyParts,
} from "@/lib/linkify";
import { parseMentionStates, type MentionStateMap } from "@/lib/mentions";

const mentionLikeClass =
  "text-blue-500 hover:underline dark:text-yellow-400 dark:hover:text-yellow-300";

export function LinkifiedText({
  text,
  className,
  linkClassName,
  as: Tag = "span",
  stopPropagation = false,
  mentionStates,
}: {
  text: string;
  className?: string;
  linkClassName?: string;
  as?: "p" | "span" | "div";
  /** 부모 Link/버튼 안에 있을 때 링크 클릭이 상위로 전파되지 않게 */
  stopPropagation?: boolean;
  mentionStates?: MentionStateMap | unknown;
}) {
  const parts = useMemo(() => parseLinkifyParts(text), [text]);
  const states = useMemo(() => parseMentionStates(mentionStates), [mentionStates]);

  return (
    <Tag className={cn(className)}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={i}>{part.value}</span>;
        }
        if (part.type === "hashtag") {
          return (
            <Link
              key={i}
              href={hashtagSearchHref(part.label)}
              className={mentionLikeClass}
              onClick={
                stopPropagation
                  ? (e) => {
                      e.stopPropagation();
                    }
                  : undefined
              }
            >
              {part.label}
            </Link>
          );
        }
        if (part.type === "mention") {
          const state = states?.[part.username.toLowerCase()];
          if (state === "blocked" || state === "denied") {
            return <span key={i}>{part.label}</span>;
          }
          return (
            <MentionHoverLink
              key={i}
              username={part.username}
              label={part.label}
              href={mentionProfileHref(part.label)}
              className={mentionLikeClass}
              stopPropagation={stopPropagation}
            />
          );
        }
        // Avoid nested <a> inside feed post Links — browsers rewrite the DOM and
        // the URL text appears to grow/shrink while React reconciles.
        const linkClass =
          linkClassName ?? "text-primary hover:underline break-all";

        if (stopPropagation && isExternalHref(part.href)) {
          return (
            <span
              key={i}
              role="link"
              tabIndex={0}
              className={cn(linkClass, "cursor-pointer")}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(part.href, "_blank", "noopener,noreferrer");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(part.href, "_blank", "noopener,noreferrer");
                }
              }}
            >
              {part.label}
            </span>
          );
        }
        return (
          <a
            key={i}
            href={part.href}
            {...(isExternalHref(part.href)
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className={linkClass}
          >
            {part.label}
          </a>
        );
      })}
    </Tag>
  );
}
