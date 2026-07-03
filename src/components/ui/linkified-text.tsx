"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { isExternalHref, parseLinkifyParts } from "@/lib/linkify";

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
      {parts.map((part, i) =>
        part.type === "text" ? (
          <span key={i}>{part.value}</span>
        ) : (
          <a
            key={i}
            href={part.href}
            {...(isExternalHref(part.href)
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="text-primary hover:underline break-all"
            onClick={
              stopPropagation
                ? (e) => {
                    e.stopPropagation();
                  }
                : undefined
            }
          >
            {part.label}
          </a>
        )
      )}
    </Tag>
  );
}
