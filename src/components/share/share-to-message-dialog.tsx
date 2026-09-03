"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, ChevronLeft, Loader2, Search } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import {
  listRecentDmPartners,
  shareContentViaDm,
} from "@/actions/share-via-dm";
import { userDisplayName } from "@/lib/user-public-select";
import type { DmUserSearchHit } from "@/lib/dm-user-search";
import { cn } from "@/lib/utils";
import {
  FOLK_SHARE_SHEET_CLASS,
  FOLK_SHARE_SHEET_ITEM_CLASS,
  FOLK_SHARE_SHEET_TITLE_CLASS,
} from "@/lib/folk-dropdown-accent";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareMessage: string;
  postId?: string;
  tone?: "folk" | "plain";
  onShared: (roomId: string) => void;
  onError?: (message: string) => void;
  onBack?: () => void;
};

export function ShareToMessageDialog({
  open,
  onOpenChange,
  shareMessage,
  postId,
  tone = "folk",
  onShared,
  onError,
  onBack,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DmUserSearchHit[]>([]);
  const [recent, setRecent] = useState<DmUserSearchHit[]>([]);
  const [selected, setSelected] = useState<Map<string, DmUserSearchHit>>(new Map());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [searchPending, startSearchTransition] = useTransition();
  const [recentPending, startRecentTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim().replace(/^@+/, "");
  const selectedList = [...selected.values()];
  const showSearch = trimmed.length >= 1;
  const list = showSearch ? results : recent;

  const accent =
    tone === "folk"
      ? {
          sheet: FOLK_SHARE_SHEET_CLASS,
          item: FOLK_SHARE_SHEET_ITEM_CLASS,
          title: FOLK_SHARE_SHEET_TITLE_CLASS,
          check: "border-folk-cobalt bg-folk-cobalt text-white dark:border-primary dark:bg-primary",
          send: "bg-folk-cobalt text-white hover:bg-folk-cobalt/90 disabled:bg-folk-cobalt/40 dark:bg-primary dark:hover:bg-primary/90 dark:disabled:bg-primary/40",
        }
      : {
          sheet: "bg-background border-border",
          item: "hover:bg-muted/80 active:bg-muted",
          title: "text-foreground",
          check: "border-[#1D9BF0] bg-[#1D9BF0] text-white",
          send: "bg-[#1D9BF0] text-white hover:bg-[#1A8CD8] disabled:bg-[#1D9BF0]/40",
        };

  const resetState = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelected(new Map());
    setNote("");
    setError("");
    setSending(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }
    startRecentTransition(async () => {
      try {
        const partners = await listRecentDmPartners();
        setRecent(partners);
      } catch {
        setRecent([]);
      }
    });
  }, [open, resetState]);

  const fetchUsers = useCallback((term: string) => {
    const q = term.trim().replace(/^@+/, "");
    if (q.length < 1) {
      setResults([]);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    startSearchTransition(async () => {
      try {
        const res = await fetch(`/api/messages/user-search?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const body = await res.json();
        if (!res.ok || !body.ok) {
          if (!ac.signal.aborted) setResults([]);
          return;
        }
        setResults(Array.isArray(body.users) ? body.users : []);
      } catch {
        if (!ac.signal.aborted) setResults([]);
      }
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchUsers, open]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function toggleUser(user: DmUserSearchHit) {
    setError("");
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.set(user.id, user);
      return next;
    });
  }

  async function handleSend() {
    if (selectedList.length === 0 || sending) return;
    setSending(true);
    setError("");
    const result = await shareContentViaDm({
      recipientIds: selectedList.map((u) => u.id),
      shareMessage: postId ? undefined : shareMessage,
      postId,
      note,
    });
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      onError?.(result.error);
      return;
    }
    onOpenChange(false);
    onShared(result.roomId);
  }

  function handleBack() {
    onOpenChange(false);
    onBack?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <DialogPortal>
        <DialogOverlay className="z-[200]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-[201] outline-none flex flex-col overflow-hidden",
            "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-[min(100vw-1rem,28rem)] h-[min(90vh,36rem)]",
            "rounded-2xl border-2 shadow-2xl p-0",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            accent.sheet
          )}
          onClick={(e) => e.stopPropagation()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <header className="flex items-center gap-1 px-2 py-2.5 border-b border-border/60 shrink-0">
            <button
              type="button"
              className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="뒤로"
              onClick={handleBack}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <DialogTitle
              className={cn(
                "flex-1 text-center text-[15px] font-bold font-display pr-10",
                accent.title
              )}
            >
              공유하기
              {selectedList.length > 0 ? (
                <span className="ml-1.5 font-semibold text-muted-foreground">
                  {selectedList.length} 선택됨
                </span>
              ) : null}
            </DialogTitle>
          </header>

          <div className="px-3 py-2.5 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError("");
                }}
                placeholder="검색"
                autoComplete="off"
                spellCheck={false}
                className={cn(
                  "w-full h-10 rounded-full border bg-background/80 pl-9 pr-9 text-sm outline-none",
                  "border-border/70 focus:border-[#1D9BF0] focus:ring-1 focus:ring-[#1D9BF0]/40"
                )}
              />
              {(searchPending || recentPending) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {!searchPending && showSearch && list.length === 0 ? (
              <p className="px-4 py-10 text-sm text-muted-foreground text-center">
                검색 결과가 없습니다
              </p>
            ) : null}
            {!showSearch && !recentPending && list.length === 0 ? (
              <p className="px-4 py-10 text-sm text-muted-foreground text-center">
                이름이나 사용자 아이디로 검색해 보세요
              </p>
            ) : null}
            <ul>
              {list.map((user) => {
                const isSelected = selected.has(user.id);
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => toggleUser(user)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-60",
                        accent.item
                      )}
                    >
                      <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border/50">
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback className="text-sm bg-primary/10 text-primary">
                          {userDisplayName(user)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <DisplayNameWithSupportTier
                          name={userDisplayName(user)}
                          tier={user.supportTierSent}
                          nameClassName="text-[15px] font-semibold truncate block"
                          compact
                        />
                        <span className="block truncate text-sm text-muted-foreground">
                          @{user.username}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                          isSelected
                            ? accent.check
                            : "border-muted-foreground/40 bg-transparent"
                        )}
                        aria-hidden
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selectedList.length > 0 ? (
            <div className="shrink-0 border-t border-border/60 px-3 pt-3 pb-3 space-y-2.5">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                placeholder="쪽지 쓰기..."
                rows={2}
                disabled={sending}
                className="w-full resize-none rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:border-[#1D9BF0] focus:ring-1 focus:ring-[#1D9BF0]/30"
              />
              {error ? <p className="text-xs text-destructive px-0.5">{error}</p> : null}
              <button
                type="button"
                disabled={sending}
                onClick={() => void handleSend()}
                className={cn(
                  "w-full h-11 rounded-full text-[15px] font-bold transition-colors",
                  accent.send
                )}
              >
                {sending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    보내는 중…
                  </span>
                ) : (
                  "보내기"
                )}
              </button>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
