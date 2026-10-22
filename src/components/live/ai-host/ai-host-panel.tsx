"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Radio } from "lucide-react";
import { AiHostStage } from "@/components/live/ai-host/ai-host-stage";
import { primeHostAudio, speakHostLine, stopHostVoice, type LipSync } from "@/components/live/ai-host/speak-host";
import { useLocale } from "@/components/providers/locale-provider";
import { classifyAiHostMessage } from "@/lib/ai-live/blocklist";
import { createAiMotion, cueAngry, cueNod, cueSpeech, type AiMotionState } from "@/lib/ai-live/motion";

type Line = { id: string; from: "you" | "host"; text: string };

let lineSeq = 0;
function nextId() {
  lineSeq += 1;
  return `ai-${Date.now().toString(36)}-${lineSeq}`;
}

/** Hero + chat. Nothing is fetched until the viewer sends a line. */
export function AiHostPanel() {
  const { t } = useLocale();
  const sessionState = useSession();
  const signedIn = sessionState?.status === "authenticated";
  const motionRef = useRef<AiMotionState | null>(null);
  const lipRef = useRef<LipSync | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  if (!motionRef.current) motionRef.current = createAiMotion(0);

  useEffect(() => () => stopHostVoice(), []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lines.length]);

  function push(line: Line) {
    setLines((prev) => [...prev, line].slice(-40));
  }

  function speak(text: string, angry: boolean) {
    const motion = motionRef.current;
    if (!motion) return;
    const now = performance.now();
    if (angry) cueAngry(motion, now);
    else cueNod(motion);
    cueSpeech(motion, text, now);
    lipRef.current = speakHostLine(text);
  }

  async function send() {
    const text = draft.trim().slice(0, 200);
    if (!text || pending) return;
    setDraft("");
    primeHostAudio();
    push({ id: nextId(), from: "you", text });
    const motion = motionRef.current;
    if (motion) cueNod(motion);

    const blocked = classifyAiHostMessage(text);
    if (blocked) {
      speak(blocked.text, true);
      push({ id: nextId(), from: "host", text: blocked.text });
      return;
    }
    if (!signedIn) {
      push({ id: nextId(), from: "host", text: t("live.aiSignIn") });
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/live/ai-host/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as { text?: string; blocked?: boolean } | null;
      if (!res.ok || !data?.text) {
        const fallback =
          res.status === 401 ? t("live.aiSignIn") : res.status === 429 ? t("live.aiRateLimit") : t("live.aiUnavailable");
        push({ id: nextId(), from: "host", text: fallback });
        return;
      }
      speak(data.text, data.blocked === true);
      push({ id: nextId(), from: "host", text: data.text });
    } catch {
      push({ id: nextId(), from: "host", text: t("live.aiUnavailable") });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="col-span-3 flex min-w-0 flex-col gap-3">
      <AiHostStage motionRef={motionRef} lipRef={lipRef} />
      <div
        ref={scrollerRef}
        className="flex max-h-52 min-h-28 flex-col gap-2 overflow-y-auto rounded-xl bg-black/40 px-3 py-2"
        aria-live="polite"
      >
        {lines.length === 0 ? (
          <p className="m-auto text-center text-sm font-semibold text-white/55">{t("live.aiEmptyChat")}</p>
        ) : (
          lines.map((line) => (
            <p key={line.id} className="text-sm leading-5 text-white/90">
              <span className={line.from === "host" ? "mr-1.5 font-black text-[#f6e7d4]" : "mr-1.5 font-bold text-white/55"}>
                {line.from === "host" ? t("live.aiHostName") : t("live.aiYou")}
              </span>
              <span className={line.from === "host" ? "font-semibold" : ""}>{line.text}</span>
            </p>
          ))
        )}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={draft}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("live.aiChatPlaceholder")}
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/50 px-4 py-2 text-sm text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim() || sessionState?.status === "loading"}
          onPointerDown={() => primeHostAudio()}
          className="rounded-full bg-[#c45c3e] px-4 py-2 text-sm font-black text-white disabled:opacity-40"
        >
          {t("live.aiSend")}
        </button>
      </form>
      {sessionState?.status === "unauthenticated" ? (
        <Link href="/auth/signin?callbackUrl=/live" className="text-center text-xs font-bold text-[#8eb6ff]">
          {t("live.aiSignIn")}
        </Link>
      ) : null}
    </div>
  );
}

export function AiOfficialLiveCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useLocale();
  return (
    <button type="button" onClick={onOpen} className="min-w-0 text-left">
      <div className="relative flex aspect-video items-end overflow-hidden rounded-xl border border-white/10 bg-[#1a120f] p-3">
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-[#1a4fa0] px-2 py-0.5 text-[10px] font-black text-white">
          <Radio className="h-3 w-3" />
          {t("live.aiOfficialBadge")}
        </span>
        <span className="text-sm font-black text-white">{t("live.aiHostName")}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{t("live.aiCardTitle")}</p>
      <p className="text-[13px] text-white/65">{t("live.aiCardSub")}</p>
    </button>
  );
}
