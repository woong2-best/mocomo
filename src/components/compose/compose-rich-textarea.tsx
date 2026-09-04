"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userDisplayName } from "@/lib/user-public-select";
import { parseLinkifyParts } from "@/lib/linkify";
import { cn } from "@/lib/utils";

type MentionUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  variant?: "inline" | "default";
};

const tokenClass = "text-folk-cobalt font-semibold";

function getMentionContext(
  text: string,
  cursor: number
): { query: string; start: number } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
  if (!match) return null;
  const query = match[1] ?? "";
  return { query, start: cursor - query.length - 1 };
}

export function ComposeRichTextarea({
  value,
  onChange,
  variant = "default",
  className,
  disabled,
  placeholder,
  rows = 3,
  ...rest
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const parts = useMemo(() => parseLinkifyParts(value), [value]);

  const typography = cn(
    variant === "inline"
      ? "text-[15px] leading-relaxed"
      : "text-sm leading-relaxed",
    "whitespace-pre-wrap break-words"
  );

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;
    mirror.scrollTop = ta.scrollTop;
  }, []);

  const updateMentionContext = useCallback(
    (text: string, cursor: number) => {
      const ctx = getMentionContext(text, cursor);
      if (ctx) {
        setMentionStart(ctx.start);
        setMentionQuery(ctx.query);
        setMentionOpen(true);
        setActiveIndex(0);
        return;
      }
      setMentionOpen(false);
    },
    []
  );

  const handleChange = (next: string, cursor: number) => {
    onChange(next);
    updateMentionContext(next, cursor);
  };

  const insertMention = useCallback(
    (username: string) => {
      const ta = textareaRef.current;
      const cursor = ta?.selectionStart ?? value.length;
      const before = value.slice(0, mentionStart);
      const after = value.slice(cursor);
      const spacer = after.startsWith(" ") || after.length === 0 ? "" : " ";
      const next = `${before}@${username}${spacer}${after}`;
      onChange(next);
      setMentionOpen(false);
      requestAnimationFrame(() => {
        if (!ta) return;
        const pos = mentionStart + username.length + 2 + spacer.length;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      });
    },
    [mentionStart, onChange, value]
  );

  useEffect(() => {
    if (!mentionOpen) {
      setMentionUsers([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/users/collab-search?q=${encodeURIComponent(mentionQuery)}`,
            { credentials: "include" }
          );
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as { users?: MentionUser[] };
          if (!cancelled) {
            setMentionUsers(Array.isArray(data.users) ? data.users : []);
          }
        } catch {
          if (!cancelled) setMentionUsers([]);
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mentionOpen, mentionQuery]);

  useEffect(() => {
    if (activeIndex >= mentionUsers.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, mentionUsers.length]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionOpen || mentionUsers.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % mentionUsers.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + mentionUsers.length) % mentionUsers.length);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const user = mentionUsers[activeIndex];
      if (user) insertMention(user.username);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setMentionOpen(false);
    }
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "relative",
          variant === "inline" ? "min-h-[72px]" : "min-h-[160px]"
        )}
      >
        <div
          ref={mirrorRef}
          aria-hidden
          className={cn(
            typography,
            "pointer-events-none overflow-hidden",
            variant === "inline" ? "min-h-[72px] p-0" : "min-h-[160px] rounded-xl border border-transparent p-3"
          )}
        >
          {value ? (
            <>
              {parts.map((part, i) => {
                if (part.type === "text") {
                  return <span key={i}>{part.value}</span>;
                }
                if (part.type === "hashtag" || part.type === "mention") {
                  return (
                    <span key={i} className={tokenClass}>
                      {part.label}
                    </span>
                  );
                }
                return (
                  <span key={i} className="text-primary">
                    {part.label}
                  </span>
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
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
          onClick={(e) =>
            updateMentionContext(
              e.currentTarget.value,
              e.currentTarget.selectionStart ?? e.currentTarget.value.length
            )
          }
          onKeyUp={(e) =>
            updateMentionContext(
              e.currentTarget.value,
              e.currentTarget.selectionStart ?? e.currentTarget.value.length
            )
          }
          className={cn(
            typography,
            "absolute inset-0 h-full w-full resize-none bg-transparent text-transparent caret-foreground outline-none placeholder:text-transparent",
            variant === "inline"
              ? "border-0 p-0"
              : "rounded-xl border border-border bg-background/50 p-3",
            className
          )}
        />
      </div>

      {mentionOpen && mentionUsers.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-popover py-1 shadow-lg"
        >
          {mentionUsers.map((user, index) => (
            <li key={user.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/70",
                  index === activeIndex && "bg-muted/70"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertMention(user.username)}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={user.image ?? undefined} alt="" />
                  <AvatarFallback className="text-xs">
                    {user.username.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {userDisplayName(user)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{user.username}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
