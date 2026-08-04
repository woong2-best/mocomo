"use client";

import { useEffect, useRef, useState } from "react";

type Tip = {
  id: string;
  username: string;
  amount: number;
  message: string | null;
  at: string;
};

export function OverlayDonationClient({
  channelId,
  token,
}: {
  channelId: string;
  token: string;
}) {
  const [current, setCurrent] = useState<Tip | null>(null);
  const seen = useRef(new Set<string>());
  const sinceRef = useRef(new Date().toISOString());
  const queue = useRef<Tip[]>([]);
  const showing = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const q = new URLSearchParams({
          token,
          since: sinceRef.current,
        });
        const res = await fetch(`/api/overlay/${channelId}/donations?${q}`);
        if (!res.ok) return;
        const data = (await res.json()) as { tips: Tip[] };
        if (cancelled || !data.tips?.length) return;
        for (const tip of data.tips) {
          if (seen.current.has(tip.id)) continue;
          seen.current.add(tip.id);
          queue.current.push(tip);
          sinceRef.current = tip.at;
        }
      } catch {
        /* ignore */
      }
    }

    function drain() {
      if (showing.current || queue.current.length === 0) return;
      const next = queue.current.shift()!;
      showing.current = true;
      setCurrent(next);
      window.setTimeout(() => {
        setCurrent(null);
        showing.current = false;
      }, 6000);
    }

    void tick();
    const poll = window.setInterval(() => void tick(), 3000);
    const show = window.setInterval(drain, 500);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearInterval(show);
    };
  }, [channelId, token]);

  if (!current) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: 24,
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "rgba(15,15,20,0.82)",
          color: "#fff",
          borderRadius: 16,
          padding: "20px 28px",
          maxWidth: 520,
          textAlign: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: 14, opacity: 0.85 }}>후원</div>
        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
          {current.username}
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: "#fbbf24", marginTop: 8 }}>
          {current.amount.toLocaleString("ko-KR")}원
        </div>
        {current.message ? (
          <div style={{ marginTop: 12, fontSize: 16, opacity: 0.95 }}>{current.message}</div>
        ) : null}
      </div>
    </div>
  );
}
