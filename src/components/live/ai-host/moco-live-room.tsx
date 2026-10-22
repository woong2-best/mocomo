"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Radio, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { MocoStageHandle } from "@/components/live/ai-host/moco-vrm-stage";
import { useLocale } from "@/components/providers/locale-provider";
import { classifyAiHostMessage } from "@/lib/ai-live/blocklist";
import { createSpeechQueue, enqueueSpeech, type SpeechJob } from "@/lib/ai-live/speech-queue";
import { LiveMocoDonationComposerButton } from "@/components/live/live-moco-donation-composer-button";
import { VideoDonationRoomControls } from "@/components/live/video-donation-room-controls";
import { MocoDonationStage } from "@/components/live/ai-host/moco-donation-stage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localizedLiveCategoryLabel } from "@/lib/live-categories-i18n";
import { MOCO_OFFICIAL_USERNAME } from "@/lib/ai-live/official-channel-id";
import type { IdolId } from "@/lib/ai-live/idols";
import type { MessageKey } from "@/lib/i18n/message-keys";

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

type IdolTab = {
  id: IdolId;
  label: string;
  active: boolean;
  onSelect: () => void;
};

/** Watch page. Grid stays silent. Donations use the same MOCO live payment as every other room. */
export function MocoLiveRoom({
  channelId,
  vrmUrl,
  hostNameKey = "live.aiHostName",
  titleKey = "live.aiCardTitle",
  subKey = "live.aiCardSub",
  memberId = null,
  donationPoll = "/api/live/moco/donations",
  signInPath = "/live/moco",
  hostUsername = MOCO_OFFICIAL_USERNAME,
  tabs,
}: {
  channelId?: string | null;
  vrmUrl?: string;
  hostNameKey?: MessageKey;
  titleKey?: MessageKey;
  subKey?: MessageKey;
  memberId?: IdolId | null;
  donationPoll?: string;
  signInPath?: string;
  hostUsername?: string;
  tabs?: IdolTab[];
}) {
  const { t, locale } = useLocale();
  const sessionState = useSession();
  const status = sessionState?.status ?? "loading";
  const signedIn = status === "authenticated";

  const stageRef = useRef<MocoStageHandle | null>(null);
  const memberRef = useRef(memberId);
  memberRef.current = memberId;
  const hostName = t(hostNameKey);
  const queueRef = useRef(createSpeechQueue());
  const speakingRef = useRef(false);
  const waitRef = useRef<string[]>([]);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  const donationHoldRef = useRef(false);
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
    if (speakingRef.current || donationHoldRef.current) return;
    const job = queueRef.current.items.shift();
    if (!job) return;
    speakingRef.current = true;
    const token = queueRef.current.epoch;
    try {
      await stageRef.current?.playVoice(job.audio);
    } finally {
      if (token !== queueRef.current.epoch) return;
      speakingRef.current = false;
      if (donationHoldRef.current) return;
      void drain();
    }
  }, []);

  const onDonationActive = useCallback(
    (active: boolean) => {
      donationHoldRef.current = active;
      if (active) {
        stageRef.current?.stopVoice();
        return;
      }
      void drain();
    },
    [drain]
  );

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
          body: JSON.stringify({ text, member: memberRef.current ?? undefined }),
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
    <div className="live-studio-twitch mx-auto w-full max-w-[1600px] space-y-3 px-2 py-3 sm:px-4 lg:pb-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="live-badge text-xs px-2.5 py-0.5">
          <Radio className="h-3 w-3" />
          LIVE
        </span>
        <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
          {localizedLiveCategoryLabel("JUST_CHATTING", locale)}
        </span>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight sm:text-lg">{t(titleKey)}</h1>
      </div>

      <p className="text-sm">
        <span className="text-primary">@{hostUsername}</span>
        <span className="ml-2 text-muted-foreground">{t(subKey)}</span>
      </p>

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[1fr_340px] xl:gap-4">
        <div className="min-w-0">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black ring-1 ring-border/50">
            <img src="/live/moco-poster.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <MocoVrmStage framing="stage" vrmUrl={vrmUrl} onReady={onReady} />
            {channelId ? (
              <MocoDonationStage
                channelId={channelId}
                pollUrl={donationPoll}
                onActive={onDonationActive}
                onLine={(text) => addLine("moco", text)}
              />
            ) : null}
          </div>
          {tabs && tabs.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={tab.active}
                  onClick={tab.onSelect}
                  className={
                    tab.active
                      ? "rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
                      : "rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex h-full min-h-[min(70vh,560px)] flex-col overflow-hidden rounded-xl border border-border/60 bg-background xl:sticky xl:top-16">
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-2.5">
            <span className="text-sm font-semibold">{t("live.chat.title")}</span>
            <span className="text-xs font-medium text-muted-foreground">{hostName}</span>
          </div>
          <div ref={logRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {lines.map((line) => (
              <div key={line.id}>
                <p className="text-xs font-semibold text-primary">
                  @{line.who === "you" ? t("live.aiYou") : hostUsername}
                </p>
                <p className="mt-0.5 text-sm leading-snug break-words">{line.text}</p>
              </div>
            ))}
          </div>
          {signedIn ? (
            <form onSubmit={onSubmit} className="shrink-0 space-y-2 border-t border-border/60 p-2.5">
              {channelId ? <VideoDonationRoomControls channelId={channelId} isHost={false} /> : null}
              <div className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 200))}
                  maxLength={200}
                  aria-label={t("live.sdp6wzr")}
                  placeholder={t("live.sdp6wzr")}
                  className="h-9 flex-1 rounded-lg text-sm"
                />
                {channelId ? (
                  <LiveMocoDonationComposerButton
                    channelId={channelId}
                    hostDisplayName={hostName}
                    buttonSize={36}
                    className="h-9 w-9"
                  />
                ) : null}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!draft.trim()}
                  className="h-9 shrink-0 rounded-lg bg-folk-terracotta px-3 hover:bg-folk-terracotta/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : status === "unauthenticated" ? (
            <p className="shrink-0 p-3 text-center text-xs text-muted-foreground">
              <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(signInPath)}`} className="hover:underline">
                {t("live.s1vpyvyp")}
              </Link>
            </p>
          ) : (
            <div className="h-[53px] shrink-0 border-t border-border/60" />
          )}
        </div>
      </div>
    </div>
  );
}
