"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsd } from "@/lib/money";

type AlertItem = {
  id: string;
  kind: "tip" | "cheer" | "chat";
  username: string;
  amount: number;
  message: string | null;
  at: string;
  eventType?: string;
  rouletteLabel?: string;
};

function SideAlertCard({ item }: { item: AlertItem }) {
  const name = item.username.startsWith("@") ? item.username.slice(1) : item.username;
  const isChat = item.kind === "chat";
  const isCheer = item.kind === "cheer";

  let title = "";
  if (isChat) title = `${name} · 채팅`;
  else if (item.eventType === "ROULETTE" && item.rouletteLabel) {
    title = `${name} 룰렛 · ${item.rouletteLabel}`;
  } else if (isCheer) title = `${name} · ${item.amount.toLocaleString()} CP`;
  else title = `${name} · ${formatUsd(item.amount)}`;

  return (
    <div
      style={{
        background: isChat ? "rgba(12, 28, 48, 0.88)" : "rgba(15, 15, 20, 0.88)",
        color: "#fff",
        borderRadius: 12,
        padding: "10px 14px",
        maxWidth: 320,
        border: isChat ? "1px solid rgba(125, 211, 252, 0.35)" : "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: isChat ? "#7dd3fc" : "#5dff6a" }}>{title}</div>
      {item.message ? (
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.4, opacity: 0.95 }}>{item.message}</div>
      ) : null}
    </div>
  );
}

/** OBS 브라우저 소스 — 화면 오른쪽 후원·CP·채팅 알림 (라이브 페이지만) */
export function OverlayDonationClient({
  channelId,
  token,
}: {
  channelId: string;
  token: string;
}) {
  const [visible, setVisible] = useState<AlertItem[]>([]);
  const seen = useRef(new Set<string>());
  const sinceRef = useRef(new Date().toISOString());
  const queue = useRef<AlertItem[]>([]);
  const draining = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const q = new URLSearchParams({ token, since: sinceRef.current });
        const res = await fetch(`/api/overlay/${channelId}/alerts?${q}`);
        if (!res.ok) return;
        const data = (await res.json()) as { alerts: AlertItem[] };
        if (cancelled || !data.alerts?.length) return;
        for (const item of data.alerts) {
          if (seen.current.has(item.id)) continue;
          seen.current.add(item.id);
          queue.current.push(item);
          sinceRef.current = item.at;
        }
      } catch {
        /* ignore */
      }
    }

    function drain() {
      if (draining.current || queue.current.length === 0) return;
      draining.current = true;
      const next = queue.current.shift()!;
      setVisible((prev) => [next, ...prev].slice(0, 4));
      const ms = next.kind === "chat" ? 4200 : next.kind === "cheer" ? 5200 : 5800;
      window.setTimeout(() => {
        setVisible((prev) => prev.filter((x) => x.id !== next.id));
        draining.current = false;
      }, ms);
    }

    void tick();
    const poll = window.setInterval(() => void tick(), 2500);
    const show = window.setInterval(drain, 400);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(show);
    };
  }, [channelId, token]);

  return (
    <div
      style={{
        position: "fixed",
        top: 48,
        right: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
        maxWidth: "min(340px, 38vw)",
        pointerEvents: "none",
      }}
    >
      {visible.map((item) => (
        <SideAlertCard key={item.id} item={item} />
      ))}
    </div>
  );
}
