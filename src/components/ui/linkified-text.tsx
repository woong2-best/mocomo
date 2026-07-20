"use client";

import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  hashtagSearchHref,
  isExternalHref,
  mentionProfileHref,
  parseLinkifyParts,
} from "@/lib/linkify";

const mentionLikeClass =
  "text-blue-500 hover:underline dark:text-yellow-400 dark:hover:text-yellow-300";

export function LinkifiedText({
  text,
  className,
  as: Tag = "span",
  stopPropagation = false,
}: {
  text: string;
  className?: string;
  as?: "p" | "span" | "div";
  /** 부모 Link/버튼 안에 있을 때 링크 클릭이 상위로 전파되지 않게 */
  stopPropagation?: boolean;
}) {
  const parts = useMemo(() => parseLinkifyParts(text), [text]);

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
          return (
            <Link
              key={i}
              href={mentionProfileHref(part.label)}
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
        // Avoid nested <a> inside feed post Links — browsers rewrite the DOM and
        // the URL text appears to grow/shrink while React reconciles.
        if (stopPropagation && isExternalHref(part.href)) {
          return (
            <span
              key={i}
              role="link"
              tabIndex={0}
              className="text-primary hover:underline break-all cursor-pointer"
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
            className="text-primary hover:underline break-all"
          >
            {part.label}
          </a>
        );
      })}
    </Tag>
  );
}
