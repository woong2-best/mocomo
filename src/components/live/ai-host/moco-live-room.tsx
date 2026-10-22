"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { MocoStageHandle } from "@/components/live/ai-host/moco-vrm-stage";
import { useLocale } from "@/components/providers/locale-provider";
import { classifyAiHostMessage } from "@/lib/ai-live/blocklist";
import { createSpeechQueue, enqueueSpeech, type SpeechJob } from "@/lib/ai-live/speech-queue";

const MocoVrmStage = dynamic(
  () => import("@/components/live/ai-host/moco-vrm-stage").then((m) => m.MocoVrmStage),
  { ssr: false }
);

type Line = { id: number; who: "you" | "moco"; text: string };

function decodeAudioBase64(value: string): ArrayBuffer | null {
  if (!value || value.length > 4_000_000) return null;
  try {
    const bin = atob(value);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i) & 0xff;
    return out.buffer;
  } catch {
    return null;
  }
}

/** Watch page. The grid stays silent. She speaks only after a signed-in line. */
export function MocoLiveRoom() {
  const { t } = useLocale();
  const sessionState = useSession();
  const status = sessionState?.status ?? "loading";
  const signedIn = status === "authenticated";

  const stageRef = useRef<MocoStageHandle | null>(null);
  const queueRef = useRef(createSpeechQueue());
  const speakingRef = useRef(false);
  const waitRef = useRef<string[]>([]);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const idRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");

  const onReady = useCallback((handle: MocoStageHandle | null) => {
    stageRef.current = handle;
  }, []);

  const addLine = useCallback((who: Line["who"], text: string) => {
    const id = (idRef.current += 1);
    setLines((prev) => [...prev, { id, who, text }].slice(-12));
  }, []);

  const drain = useCallback(async () => {
    if (speakingRef.current) return;
    const job = queueRef.current.items.shift();
    if (!job) return;
    speakingRef.current = true;
    const token = queueRef.current.epoch;
    try {
      await stageRef.current?.playVoice(job.audio);
    } finally {
      if (token !== queueRef.current.epoch) return;
      speakingRef.current = false;
      void drain();
    }
  }, []);

  const pushAudio = useCallback(
    (job: SpeechJob) => {
      const interrupt = enqueueSpeech(queueRef.current, job);
      if (interrupt) {
        speakingRef.current = false;
        stageRef.current?.stopVoice();
      }
      void drain();
    },
    [drain]
  );

  const ask = useCallback(
    async (text: string) => {
      try {
        const res = await fetch("/api/live/ai-host/speak", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!aliveRef.current) return;
        if (res.status === 401) {
          addLine("moco", t("live.aiSignIn"));
          return;
        }
        if (res.status === 429) {
          addLine("moco", t("live.aiRateLimit"));
          return;
        }
        if (!res.ok) {
          addLine("moco", t("live.aiUnavailable"));
          return;
        }
        const json = (await res.json()) as { text?: unknown; audioBase64?: unknown };
        if (!aliveRef.current) return;
        const reply = typeof json.text === "string" ? json.text.trim() : "";
        if (reply) addLine("moco", reply);
        const audio = typeof json.audioBase64 === "string" ? decodeAudioBase64(json.audioBase64) : null;
        if (audio) pushAudio({ audio, priority: "chat" });
      } catch {
        if (aliveRef.current) addLine("moco", t("live.aiUnavailable"));
      }
    },
    [addLine, pushAudio, t]
  );

  const pump = useCallback(async () => {
    if (busyRef.current) return;
    const next = waitRef.current.shift();
    if (!next) return;
    busyRef.current = true;
    try {
      await ask(next);
    } finally {
      busyRef.current = false;
      if (aliveRef.current) void pump();
    }
  }, [ask]);

  useEffect(() => {
    aliveRef.current = true;
    const onDonation = (event: Event) => {
      const detail = (event as CustomEvent<{ text?: unknown; audioBase64?: unknown }>).detail;
      const text = typeof detail?.text === "string" ? detail.text.trim().slice(0, 200) : "";
      if (text && classifyAiHostMessage(text)) {
        stageRef.current?.stopVoice();
        return;
      }
      const audio = typeof detail?.audioBase64 === "string" ? decodeAudioBase64(detail.audioBase64) : null;
      if (text) addLine("moco", text);
      if (audio) pushAudio({ audio, priority: "donation" });
      else stageRef.current?.stopVoice();
    };
    window.addEventListener("moco-live-donation", onDonation);
    return () => {
      aliveRef.current = false;
      window.removeEventListener("moco-live-donation", onDonation);
      stageRef.current?.stopVoice();
    };
  }, [addLine, pushAudio]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    addLine("you", text);
    const blocked = classifyAiHostMessage(text);
    if (blocked) {
      addLine("moco", blocked.text);
      return;
    }
    if (!signedIn) {
      addLine("moco", t("live.aiSignIn"));
      return;
    }
    if (waitRef.current.length >= 2) {
      addLine("moco", t("live.aiRateLimit"));
      return;
    }
    stageRef.current?.prime();
    waitRef.current.push(text);
    void pump();
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-3 py-4">
      <Link href="/live" className="w-fit text-sm font-semibold text-white/70 hover:text-white">
        {t("live.navBack")}
      </Link>
      <div className="relative mt-3 aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#241c33]">
        <img
          src="/live/moco-poster.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <MocoVrmStage framing="stage" onReady={onReady} />
        <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-[#1a4fa0] px-2 py-1 text-[11px] font-black text-white">
          {t("live.aiOfficialBadge")}
        </span>
      </div>
      <h1 className="mt-3 text-lg font-semibold text-white">{t("live.aiHostName")}</h1>
      <p className="text-sm text-white/65">{t("live.aiCardTitle")}</p>
      <p className="mt-1 text-xs text-white/45">{t("live.aiCardSub")}</p>

      {lines.length > 0 ? (
        <div ref={logRef} className="mt-4 max-h-40 space-y-2 overflow-y-auto pr-1">
          {lines.map((line) => (
            <p key={line.id} className="text-sm leading-5">
              <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                {line.who === "you" ? t("live.aiYou") : t("live.aiHostName")}
              </span>
              <span className={line.who === "you" ? "text-white/80" : "text-white"}>{line.text}</span>
            </p>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 200))}
          maxLength={200}
          aria-label={t("live.aiChatPlaceholder")}
          placeholder={t("live.aiChatPlaceholder")}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-lg bg-[#1a4fa0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t("live.aiSend")}
        </button>
      </form>
      {status === "unauthenticated" ? (
        <Link
          href={`/auth/signin?callbackUrl=${encodeURIComponent("/live/moco")}`}
          className="mt-2 w-fit text-xs font-semibold text-white/70 hover:text-white"
        >
          {t("live.aiSignIn")}
        </Link>
      ) : null}
    </div>
  );
}
