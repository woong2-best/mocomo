"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "메시지를 입력하세요",
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="shrink-0 border-t border-border/60 bg-background px-3 py-3 sm:px-4 pb-safe">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <div className="flex-1 flex items-center min-h-[44px] rounded-3xl border border-border/80 bg-muted/40 px-4 py-2 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40 transition-shadow">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="flex-1 resize-none bg-transparent text-sm leading-snug outline-none placeholder:text-muted-foreground max-h-28 min-h-[24px] py-0.5"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
            }}
          />
        </div>
        <Button
          type="button"
          size="icon"
          className={cn(
            "h-11 w-11 rounded-full shrink-0 shadow-sm",
            value.trim() ? "bg-folk-terracotta text-white hover:bg-folk-terracotta-dark" : "bg-muted text-muted-foreground"
          )}
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="보내기"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2 hidden sm:block">
        Enter로 전송 · Shift+Enter 줄바꿈
      </p>
    </div>
  );
}
