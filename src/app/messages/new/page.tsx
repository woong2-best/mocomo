"use client";

import { useCallback, useEffect, useRef, useState, Suspense, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getOrCreateDM } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { userDisplayName } from "@/lib/user-public-select";
import type { DmUserSearchHit } from "@/lib/dm-user-search";
import { cn } from "@/lib/utils";
import { ChevronLeft, Loader2, Search, Users, Radio, UserCheck } from "lucide-react";

export default function NewMessagePage() {
  return (
    <Suspense fallback={<div className="flex-1 min-h-0 animate-pulse bg-muted/20" />}>
      <NewMessagePageInner />
    </Suspense>
  );
}

function NewMessagePageInner() {
  const router = useRouter();
  const { isNativeApp } = useClientPlatform();
  const searchParams = useSearchParams();
  const shareText = searchParams.get("share")?.trim() ?? "";
  const shareLabel = searchParams.get("label")?.trim() ?? "라이브";
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DmUserSearchHit[]>([]);
  const [searchPending, startSearchTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = username.trim().replace(/^@+/, "");

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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(username), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, fetchUsers]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function openDm(userId: string) {
    setLoading(true);
    setError("");
    const result = await getOrCreateDM(userId);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("room" in result && result.room) {
      const base = `/messages/${result.room.id}`;
      if (shareText) {
        router.push(`${base}?send=${encodeURIComponent(shareText)}`);
      } else {
        router.push(base);
      }
    }
  }

  async function startDm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const q = trimmed;
    if (!q) {
      setError("닉네임을 입력해 주세요.");
      return;
    }

    const exact = results.find((u) => u.username.toLowerCase() === q.toLowerCase());
    if (exact) {
      await openDm(exact.id);
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/users/lookup?username=${encodeURIComponent(q)}`);
    if (!res.ok) {
      setError("유저를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }
    const { id } = await res.json();
    // openDm manages loading for the DM create/navigate step
    setLoading(false);
    await openDm(id);
  }

  const followingHits = results.filter((u) => u.isFollowing);
  const otherHits = results.filter((u) => !u.isFollowing);
  const showResults = trimmed.length >= 1;

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-2 px-3 py-3 border-b border-border/60 shrink-0">
        <Link href="/messages" className="p-2 rounded-full hover:bg-muted/80">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        {!isNativeApp && <h1 className="font-bold text-lg">새 메시지</h1>}
        {isNativeApp && <h1 className="sr-only">새 메시지</h1>}
      </header>

      <div
        className={cn(
          "flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-6",
          isNativeApp && "pb-native-fab"
        )}
      >
        {shareText ? (
          <section className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <Radio className="h-4 w-4" />
              {shareLabel} 링크 보내기
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              받는 사람을 선택하면 아래 라이브 링크가 자동으로 전송됩니다.
            </p>
            <p className="text-xs rounded-xl bg-background/80 border border-border/60 px-3 py-2 whitespace-pre-wrap break-all">
              {shareText}
            </p>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Search className="h-4 w-4" />
            닉네임으로 찾기
          </div>
          <form onSubmit={startDm} className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="이름이나 사용자 아이디로 검색하기"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                className="rounded-2xl h-12 pl-10 text-base"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              {searchPending && trimmed.length >= 1 && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {error && <p className="text-sm text-destructive px-1">{error}</p>}

            {showResults && (
              <div className="rounded-2xl border border-border/60 bg-background overflow-hidden max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain">
                {!searchPending && results.length === 0 && (
                  <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                    검색 결과가 없습니다
                  </p>
                )}

                {followingHits.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5" />
                      팔로우 중
                    </p>
                    {followingHits.map((u) => (
                      <UserSearchRow
                        key={u.id}
                        user={u}
                        disabled={loading}
                        onSelect={() => void openDm(u.id)}
                      />
                    ))}
                  </div>
                )}

                {otherHits.length > 0 && (
                  <div>
                    {followingHits.length > 0 && <div className="border-t border-border/60" />}
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      사람
                    </p>
                    {otherHits.map((u) => (
                      <UserSearchRow
                        key={u.id}
                        user={u}
                        disabled={loading}
                        onSelect={() => void openDm(u.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {!showResults && (
              <Button type="submit" className="w-full rounded-2xl h-11" disabled={loading}>
                {loading ? "확인 중…" : "대화 시작"}
              </Button>
            )}
            {showResults && results.length === 0 && !searchPending && (
              <Button type="submit" className="w-full rounded-2xl h-11" disabled={loading}>
                {loading ? "확인 중…" : "대화 시작"}
              </Button>
            )}
          </form>
        </section>

        {!showResults && (
          <>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <span className="relative flex justify-center text-xs text-muted-foreground bg-background px-2">
                또는
              </span>
            </div>

            <section className="rounded-2xl border border-border/60 p-4 space-y-3 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">단체대화방</p>
                  <p className="text-xs text-muted-foreground">
                    코스어 방(공지·투표) · 친목 방(단체 통화)
                  </p>
                </div>
              </div>
              <Button asChild className="w-full rounded-2xl">
                <Link href="/messages/groups/new">단체방 만들기</Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-2xl">
                <Link href="/messages/join">입장 코드로 들어가기</Link>
              </Button>
            </section>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground px-2">
          모욕, 비난, 성희롱 및 불법 행위는 법적 처벌 대상이 될 수 있습니다.
        </p>
      </div>
    </div>
  );
}

function UserSearchRow({
  user,
  disabled,
  onSelect,
}: {
  user: DmUserSearchHit;
  disabled: boolean;
  onSelect: () => void;
}) {
  const displayName = userDisplayName(user);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-60"
    >
      <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border/50">
        <AvatarImage src={user.image ?? undefined} />
        <AvatarFallback className="text-sm bg-primary/10 text-primary">
          {displayName[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <DisplayNameWithSupportTier
          name={displayName}
          tier={user.supportTierSent}
          nameClassName="text-[15px] font-semibold truncate block"
          compact
        />
        <span className="block truncate text-sm text-muted-foreground">@{user.username}</span>
      </span>
    </button>
  );
}
