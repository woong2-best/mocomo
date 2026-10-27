"use client";

import { useCallback, useMemo, useRef, type TextareaHTMLAttributes } from "react";
import { isExternalHref, parseLinkifyParts } from "@/lib/linkify";
import { cn } from "@/lib/utils";

export const QNA_DETAIL_LINK_CLASS =
  "text-green-600 hover:text-green-700 underline break-all dark:text-green-400 dark:hover:text-green-300";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

/** QnA detail field — URLs render as green clickable links while typing. */
export function QnaDetailLinkTextarea({
  value,
  onChange,
  className,
  disabled,
  placeholder,
  ...rest
}: Props) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const parts = useMemo(() => parseLinkifyParts(value), [value]);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;
    mirror.scrollTop = ta.scrollTop;
  }, []);

  return (
    <div className="relative min-h-[120px] w-full">
      <div
        ref={mirrorRef}
        aria-hidden
        className="min-h-[120px] w-full overflow-hidden text-sm leading-relaxed whitespace-pre-wrap break-words"
      >
        {value ? (
          <>
            {parts.map((part, i) => {
              if (part.type === "text") {
                return <span key={i}>{part.value}</span>;
              }
              if (part.type === "hashtag" || part.type === "mention") {
                return (
                  <span key={i} className="text-folk-cobalt font-semibold">
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
                  className={cn(QNA_DETAIL_LINK_CLASS, "pointer-events-auto relative z-20")}
                >
                  {part.label}
                </a>
              );
            })}
            {value.endsWith("\n") ? <br /> : null}
          </>
        ) : (
          <span className="text-muted-foreground/70">{placeholder}</span>
        )}
      </div>

      <textarea
        {...rest}
        ref={textareaRef}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        className={cn(
          "absolute inset-0 z-10 h-full min-h-[120px] w-full resize-y bg-transparent text-sm leading-relaxed whitespace-pre-wrap break-words text-transparent caret-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-60",
          className
        )}
      />
    </div>
  );
}
