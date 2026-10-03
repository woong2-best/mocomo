"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ContributionTowerBlockDto } from "@/lib/contribution-tower/service";
import { useLocale } from "@/components/providers/locale-provider";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import {
  ContributionTowerArena,
  blockToContributionPayload,
  type ContributionTowerArenaHandle,
} from "@/components/contribution-tower/contribution-tower-arena";

const POLL_MS = 4000;

type ApiResponse = {
  blocks: ContributionTowerBlockDto[];
  totalVisible: number;
};

export function ContributionTowerView({ initial }: { initial: ApiResponse }) {
  const { t } = useLocale();
  const [totalVisible, setTotalVisible] = useState(initial.totalVisible);
  const [arenaHandle, setArenaHandle] = useState<ContributionTowerArenaHandle | null>(null);
  const maxStackRef = useRef(initial.blocks.reduce((m, b) => Math.max(m, b.stackOrder), 0));
  const knownBlockIdsRef = useRef(new Set(initial.blocks.map((b) => b.id)));

  const registerHandle = useCallback((handle: ContributionTowerArenaHandle | null) => {
    setArenaHandle(handle);
  }, []);

  const mergeIncoming = useCallback(
    (incoming: ContributionTowerBlockDto[]) => {
      if (!arenaHandle || incoming.length === 0) return;
      const sorted = [...incoming].sort((a, b) => a.stackOrder - b.stackOrder);
      for (const block of sorted) {
        if (knownBlockIdsRef.current.has(block.id)) continue;
        knownBlockIdsRef.current.add(block.id);
        maxStackRef.current = Math.max(maxStackRef.current, block.stackOrder);
        arenaHandle.addContribution(blockToContributionPayload(block));
      }
    },
    [arenaHandle],
  );

  const pollNew = useCallback(async () => {
    const after = maxStackRef.current;
    try {
      if (after <= 0) {
        const res = await fetch("/api/contribution-tower?limit=200", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as ApiResponse;
        setTotalVisible(data.totalVisible);
        mergeIncoming(data.blocks);
        return;
      }
      const res = await fetch(`/api/contribution-tower?afterStackOrder=${after}&limit=100`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ApiResponse;
      setTotalVisible(data.totalVisible);
      mergeIncoming(data.blocks);
    } catch {
      /* ignore poll errors */
    }
  }, [mergeIncoming]);

  useEffect(() => {
    const id = window.setInterval(() => void pollNew(), POLL_MS);
    return () => window.clearInterval(id);
  }, [pollNew]);

  const emptyMessage = t("tower.emptyPhysics");

  return (
    <AppPageChrome maxWidth="2xl" spacing="md" className="pb-8">
      <header className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E85D04]">MoCoMo</p>
        <h1 className="text-2xl font-black text-[#1B3A6B] dark:text-sky-100">{t("tower.title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground dark:text-sky-100/80">{t("tower.desc")}</p>
        <p className="text-xs font-semibold tabular-nums text-muted-foreground dark:text-sky-100/70">
          {t("tower.totalBlocksLine", { count: totalVisible.toLocaleString() })}
        </p>
      </header>

      <ContributionTowerArena
        emptyMessage={emptyMessage}
        initialBlocks={initial.blocks}
        registerHandle={registerHandle}
      />

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground dark:text-sky-100/65">
        {t("tower.footer")}
        <Link href="/legal/payment" className="underline">
          {t("tower.paymentPolicy")}
        </Link>
      </p>
    </AppPageChrome>
  );
}
