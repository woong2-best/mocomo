"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ContributionTowerBlockDto } from "@/lib/contribution-tower/service";
import { userAvatarFallbackInitial } from "@/lib/user-public-select";
import { ColumnBase, ColumnCapital } from "@/components/contribution-tower/column-capital-base";
import styles from "@/components/contribution-tower/contribution-tower-column.module.css";

const POLL_MS = 4000;

type ApiResponse = {
  blocks: ContributionTowerBlockDto[];
  totalVisible: number;
};

function blockKey(b: ContributionTowerBlockDto) {
  return `${b.stackOrder}:${b.id}`;
}

function blockAccent(stackOrder: number) {
  const hue = (stackOrder * 37) % 360;
  return `hsl(${hue} 28% 58%)`;
}

function TowerBlock({ block, index }: { block: ContributionTowerBlockDto; index: number }) {
  return (
    <div
      className="contribution-tower-block animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{
        animationDelay: `${Math.min(index, 12) * 40}ms`,
        zIndex: block.stackOrder,
        ["--block-accent" as string]: blockAccent(block.stackOrder),
      }}
    >
      <div className={`${styles.torus} w-full`} aria-hidden />
      <div className={`${styles.stoneBlock} ${styles.stoneBlockAccent} px-3 py-2.5`}>
        <div className="flex items-center gap-2.5">
          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-[#1B3A6B]/15">
            <AvatarImage src={block.profileImageUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-[#F5F0E6] text-[#1B3A6B] text-xs font-bold">
              {userAvatarFallbackInitial({ username: block.username, name: block.displayName })}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-[#1B3A6B]">
            <p className="truncate text-sm font-black leading-tight">{block.displayName}</p>
            <p className="truncate text-[11px] font-semibold text-[#1B3A6B]/75">@{block.username}</p>
            <p className="truncate font-mono text-[9px] text-[#1B3A6B]/55">ID {block.userId}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#E85D04]">MOCO</p>
            <p className="text-base font-black tabular-nums text-[#1B3A6B]">{block.mocoQuantity}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContributionTowerView({ initial }: { initial: ApiResponse }) {
  const [blocks, setBlocks] = useState(initial.blocks);
  const [totalVisible, setTotalVisible] = useState(initial.totalVisible);
  const [loadingMore, setLoadingMore] = useState(false);
  const maxStackRef = useRef(blocks.reduce((m, b) => Math.max(m, b.stackOrder), 0));

  const mergeBlocks = useCallback((incoming: ContributionTowerBlockDto[], replaceAll: boolean) => {
    setBlocks((prev) => {
      const base = replaceAll ? [] : prev;
      const map = new Map<number, ContributionTowerBlockDto>();
      for (const b of base) map.set(b.stackOrder, b);
      for (const b of incoming) map.set(b.stackOrder, b);
      const merged = [...map.values()].sort((a, b) => a.stackOrder - b.stackOrder);
      maxStackRef.current = merged.reduce((m, b) => Math.max(m, b.stackOrder), 0);
      return merged;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/contribution-tower?limit=200", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as ApiResponse;
      setTotalVisible(data.totalVisible);
      mergeBlocks(data.blocks, true);
    } catch {
      /* ignore poll errors */
    }
  }, [mergeBlocks]);

  const pollNew = useCallback(async () => {
    const after = maxStackRef.current;
    if (after <= 0) {
      await refresh();
      return;
    }
    try {
      const res = await fetch(`/api/contribution-tower?afterStackOrder=${after}&limit=100`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ApiResponse;
      if (data.blocks.length > 0) {
        mergeBlocks(data.blocks, false);
        setTotalVisible(data.totalVisible);
      }
    } catch {
      /* ignore */
    }
  }, [mergeBlocks, refresh]);

  useEffect(() => {
    const id = window.setInterval(pollNew, POLL_MS);
    return () => window.clearInterval(id);
  }, [pollNew]);

  async function loadOlder() {
    if (loadingMore || blocks.length === 0) return;
    setLoadingMore(true);
    try {
      const minOrder = blocks[0]?.stackOrder ?? 0;
      const res = await fetch(`/api/contribution-tower?beforeStackOrder=${minOrder}&limit=80`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ApiResponse;
      if (data.blocks.length === 0) return;
      mergeBlocks(data.blocks, false);
      setTotalVisible(data.totalVisible);
    } finally {
      setLoadingMore(false);
    }
  }

  const showLoadMore = useMemo(
    () => blocks.length > 0 && blocks.length < totalVisible,
    [blocks.length, totalVisible],
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-16 pt-6">
      <header className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E85D04]">MoCoMo</p>
        <h1 className="text-2xl font-black text-[#1B3A6B] dark:text-sky-100">실시간 기여 탑</h1>
        <p className="text-sm leading-relaxed text-muted-foreground dark:text-sky-100/80">
          MOCO 충전 1회마다 아래 기둥에 돌 블록이 쌓입니다. 결제 완료 즉시 등록되며, 전 세계 이용자가
          실시간으로 확인할 수 있습니다.
        </p>
        <p className="text-xs tabular-nums text-muted-foreground dark:text-sky-100/70">
          누적 블록 <span className="font-bold text-foreground dark:text-white">{totalVisible.toLocaleString()}</span>
          개
        </p>
      </header>

      {showLoadMore ? (
        <button
          type="button"
          onClick={() => void loadOlder()}
          disabled={loadingMore}
          className="mx-auto rounded-full border border-border bg-card/90 px-4 py-2 text-xs font-bold text-muted-foreground backdrop-blur-sm hover:text-foreground disabled:opacity-50 dark:border-white/20 dark:bg-white/10 dark:text-sky-100/90"
        >
          {loadingMore ? "불러오는 중…" : "더 오래된 블록 보기"}
        </button>
      ) : null}

      <div className={styles.skyScene} aria-label="기여 탑 블록 목록">
        <div className={styles.clouds} aria-hidden />
        <div className={styles.columnWrap}>
          <div className={styles.capital}>
            <ColumnCapital />
          </div>
          <div className={`${styles.shaft} ${blocks.length === 0 ? styles.shaftEmpty : ""}`}>
            <div className={styles.shaftBackdrop} aria-hidden />
            <div className={styles.fluteOverlay} aria-hidden />
            {blocks.length === 0 ? (
              <p className={styles.emptyShaft}>
                아직 쌓인 블록이 없습니다.{" "}
                <Link href="/wallet" className="font-bold text-[#1B3A6B] underline dark:text-sky-200">
                  MOCO 충전
                </Link>
                으로 첫 블록을 올려 보세요.
              </p>
            ) : (
              <div className={styles.blockStack}>
                {blocks.map((block, i) => (
                  <TowerBlock key={blockKey(block)} block={block} index={i} />
                ))}
              </div>
            )}
          </div>
          <div className={styles.base}>
            <ColumnBase />
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground dark:text-sky-100/65">
        기여 탑에 표시되는 프로필·닉네임·아이디는 MOCO 충전 시 동의한 패키지 서비스의 일부입니다.{" "}
        <Link href="/legal/payment" className="underline">
          결제 및 환불 정책
        </Link>
      </p>
    </div>
  );
}
