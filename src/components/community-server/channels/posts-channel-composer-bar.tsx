"use client";

import { useState } from "react";
import { Camera, ImagePlus, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompose } from "@/components/compose/compose-provider";
import { useCommunityMembership } from "@/components/community-server/community-membership-context";
import { hasPermission } from "@/lib/community-server/permissions";
import { cn } from "@/lib/utils";
import { CHAT_EMOJIS, VIP_CHAT_EMOJIS } from "@/lib/community-vip-emoji";

export function PostsChannelComposerBar({ communityId }: { communityId: string }) {
  const { openCompose } = useCompose();
  const { isMember, isOwner, permissions } = useCommunityMembership();
  const [draft, setDraft] = useState("");

  const canCompose =
    (isMember || isOwner) && hasPermission(permissions, "createPosts");
  const vipEmoji = hasPermission(permissions, "vipEmoji");
  const canSend = !!draft.trim();

  function openSheet(initialContent?: string) {
    openCompose({
      communityId,
      initialContent: initialContent?.trim() || undefined,
    });
    setDraft("");
  }

  if (!canCompose) {
    return (
      <div className="shrink-0 border-t border-border/60 bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
        {isMember || isOwner
          ? "게시글 작성 권한이 없습니다."
          : "읽기 전용입니다. 커뮤니티에 참여하면 글을 작성할 수 있습니다."}
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-border/60 bg-background px-2 py-2 sm:px-3 pb-safe">
      <div className="flex flex-wrap gap-0.5 justify-center mb-1.5 max-w-3xl mx-auto">
        {CHAT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="h-8 w-8 rounded-lg hover:bg-muted/80 text-lg leading-none"
            onClick={() => setDraft((prev) => prev + emoji)}
            aria-label={`이모지 ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        {vipEmoji &&
          VIP_CHAT_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="h-8 w-8 rounded-lg hover:bg-amber-500/15 text-lg leading-none ring-1 ring-amber-400/30"
              onClick={() => setDraft((prev) => prev + emoji)}
              aria-label={`VIP 이모지 ${emoji}`}
              title="VIP 이모지"
            >
              {emoji}
            </button>
          ))}
      </div>

      <div className="flex items-end gap-1.5 max-w-3xl mx-auto">
        <div className="flex items-center gap-0.5 shrink-0 pb-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground"
            onClick={() => openSheet(draft)}
            aria-label="사진 찍기"
          >
            <Camera className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground"
            onClick={() => openSheet(draft)}
            aria-label="갤러리에서 사진"
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground"
            onClick={() => openSheet(draft)}
            aria-label="음성 메시지"
          >
            <Mic className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 flex items-center min-h-[44px] rounded-3xl border border-border/80 bg-muted/40 px-4 py-2 focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40 transition-shadow">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="게시글을 작성하세요"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm leading-snug outline-none placeholder:text-muted-foreground max-h-28 min-h-[24px] py-0.5"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) openSheet(draft);
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
            "h-11 w-11 rounded-full shrink-0 shadow-sm mb-0.5",
            canSend
              ? "bg-folk-terracotta text-white hover:bg-folk-terracotta-dark"
              : "bg-muted text-muted-foreground"
          )}
          onClick={() => openSheet(draft)}
          disabled={!canSend}
          aria-label="글쓰기"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-1.5 hidden sm:block">
        Enter로 글쓰기 · 사진·갤러리·음성은 작성 화면에서 추가
      </p>
    </div>
  );
}
