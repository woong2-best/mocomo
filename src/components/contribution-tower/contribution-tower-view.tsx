"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ContributionTowerBlockDto } from "@/lib/contribution-tower/service";
import { useLocale } from "@/components/providers/locale-provider";
import {
  ContributionTowerArena,
  blockToContributionPayload,
  type ContributionTowerArenaHandle,
} from "@/components/contribution-tower/contribution-tower-arena";
import pageStyles from "@/components/contribution-tower/contribution-tower-page.module.css";
import toastStyles from "@/components/contribution-tower/contribution-tower-rock.module.css";

const POLL_MS = 4000;
const TOAST_MS = 2200;

type ApiResponse = {
  blocks: ContributionTowerBlockDto[];
  totalVisible: number;
};

export function ContributionTowerView({ initial }: { initial: ApiResponse }) {
  const { t } = useLocale();
  const [totalVisible, setTotalVisible] = useState(initial.totalVisible);
  const [arenaHandle, setArenaHandle] = useState<ContributionTowerArenaHandle | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const maxStackRef = useRef(initial.blocks.reduce((m, b) => Math.max(m, b.stackOrder), 0));
  const knownBlockIdsRef = useRef(new Set(initial.blocks.map((b) => b.id)));
  const toastTimerRef = useRef<number | null>(null);

  const registerHandle = useCallback((handle: ContributionTowerArenaHandle | null) => {
    setArenaHandle(handle);
  }, []);

  const showToast = useCallback(
    (name: string) => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
      setToastText(t("tower.toastContributed", { name: name.trim() || t("tower.anonymous") }));
      toastTimerRef.current = window.setTimeout(() => {
        setToastText(null);
        toastTimerRef.current = null;
      }, TOAST_MS);
    },
    [t],
  );

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

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  return (
    <div className={pageStyles.page}>
      <div className={pageStyles.brand}>MOCO</div>
      <h1 className={pageStyles.title}>{t("tower.title")}</h1>
      <p className={pageStyles.desc}>{t("tower.desc")}</p>
      <p className={pageStyles.count}>
        {t("tower.totalBlocks")}{" "}
        <strong className={pageStyles.countStrong}>{totalVisible.toLocaleString()}</strong>
      </p>

      <ContributionTowerArena
        emptyPrefix={t("tower.emptyPrefix")}
        emptyTopUpLabel={t("tower.emptyTopUp")}
        emptySuffix={t("tower.emptySuffix")}
        initialBlocks={initial.blocks}
        onContribution={showToast}
        registerHandle={registerHandle}
      />

      <p className={pageStyles.footer}>
        {t("tower.footer")}
        <Link href="/legal/payment" className={pageStyles.footerLink}>
          {t("tower.paymentPolicy")}
        </Link>
      </p>

      <div
        className={`${toastStyles.toast} ${toastText ? toastStyles.toastShow : ""}`}
        role="status"
        aria-live="polite"
      >
        {toastText ?? ""}
      </div>
    </div>
  );
}
