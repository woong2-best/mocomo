"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; username: string; content: string; at: string };

export function OverlayChatClient({
  channelId,
  token,
}: {
  channelId: string;
  token: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const sinceRef = useRef(new Date(Date.now() - 60_000).toISOString());

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const q = new URLSearchParams({
          token,
          since: sinceRef.current,
        });
        const res = await fetch(`/api/overlay/${channelId}/chat?${q}`);
        if (!res.ok) return;
        const data = (await res.json()) as { messages: Msg[] };
        if (cancelled || !data.messages?.length) return;
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const m of data.messages) map.set(m.id, m);
          const next = [...map.values()].slice(-40);
          const last = next[next.length - 1];
          if (last) sinceRef.current = last.at;
          return next;
        });
      } catch {
        /* ignore */
      }
    }
    void tick();
    const id = setInterval(() => void tick(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channelId, token]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: 6,
        padding: 12,
        minHeight: "100vh",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {messages.map((m) => (
        <div
          key={m.id}
          style={{
            color: "#fff",
            textShadow: "0 1px 3px rgba(0,0,0,0.85)",
            fontSize: 18,
            lineHeight: 1.35,
            wordBreak: "break-word",
          }}
        >
          <strong style={{ color: "#7dd3fc" }}>{m.username}</strong>
          <span style={{ marginLeft: 8 }}>{m.content}</span>
        </div>
      ))}
    </div>
  );
}
