"use client";

import { useState, type ReactNode } from "react";
import type { LiveSupportEventType } from "@prisma/client";
import {
  Gift,
  Loader2,
  Megaphone,
  Music2,
  RotateCw,
  Target,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CHEER_PRESETS,
  SOUND_PRESETS,
  SUPPORT_MIN_AMOUNT,
  type SoundPresetId,
} from "@/lib/live-support/types";
import {
  createLiveMission,
  sendLiveSupport,
} from "@/hooks/use-live-support-socket";
import type { Socket } from "socket.io-client";

const TABS: { id: LiveSupportEventType | "MISSION"; label: string; icon: ReactNode }[] = [
  { id: "GENERAL", label: "일반", icon: <Gift className="h-3.5 w-3.5" /> },
  { id: "TTS", label: "TTS", icon: <Megaphone className="h-3.5 w-3.5" /> },
  { id: "SOUND", label: "사운드", icon: <Volume2 className="h-3.5 w-3.5" /> },
  { id: "ROULETTE", label: "룰렛", icon: <RotateCw className="h-3.5 w-3.5" /> },
  { id: "MISSION", label: "미션", icon: <Target className="h-3.5 w-3.5" /> },
];

export function LiveSupportDialog({
  channelId,
  hostDisplayName,
  socket,
  connected,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName,
}: {
  channelId: string;
  hostDisplayName: string;
  socket: Socket | null;
  connected: boolean;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "icon";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>("GENERAL");
  const [amount, setAmount] = useState(1_000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [soundId, setSoundId] = useState<SoundPresetId>("clap");
  const [missionTitle, setMissionTitle] = useState("");
  const [missionReward, setMissionReward] = useState(3_000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const effectiveAmount = custom ? parseInt(custom.replace(/\D/g, ""), 10) || 0 : amount;

  async function handleCheer(type: LiveSupportEventType) {
    setError("");
    setSuccess("");
    setLoading(true);
    const min = SUPPORT_MIN_AMOUNT[type];
    if (effectiveAmount < min) {
      setError(`최소 ${min.toLocaleString()} CP`);
      setLoading(false);
      return;
    }
    const res = await sendLiveSupport(socket, {
      channelId,
      type,
      amount: effectiveAmount,
      message: message.trim() || undefined,
      metadata: type === "SOUND" ? { soundId } : undefined,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "실패");
      return;
    }
    setSuccess("응원이 전달되었습니다!");
    setMessage("");
    setTimeout(() => setOpen(false), 800);
  }

  async function handleMission() {
    setError("");
    setSuccess("");
    if (!missionTitle.trim()) {
      setError("미션 내용을 입력해 주세요.");
      return;
    }
    setLoading(true);
    const res = await createLiveMission(socket, {
      channelId,
      title: missionTitle.trim(),
      rewardAmount: missionReward,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "실패");
      return;
    }
    setSuccess("미션이 등록되었습니다. 스트리머 수락을 기다려 주세요.");
    setMissionTitle("");
  }

  const triggerClass = [
    "rounded-full font-bold gap-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 text-white border-0",
    triggerClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={triggerClass} disabled={!connected}>
          <Music2 className="h-4 w-4" />
          응원 CP
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>라이브 응원 (가상 CP)</DialogTitle>
          <DialogDescription>
            {hostDisplayName}님께 결제 없이 응원 포인트(CP)를 보냅니다. 실제 결제는 &quot;후원&quot; 버튼을
            이용해 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-1">
          {TABS.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tab === t.id ? "default" : "outline"}
              className="text-[10px] px-1 py-1.5 h-auto flex flex-col gap-0.5"
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              {t.label}
            </Button>
          ))}
        </div>

        <AmountPicker
          amount={amount}
          custom={custom}
          onAmount={setAmount}
          onCustom={setCustom}
          effectiveAmount={effectiveAmount}
        />

        {tab === "GENERAL" && (
          <div className="space-y-3 mt-3">
            <Textarea
              placeholder="응원 메시지 (선택)"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 100))}
              rows={2}
            />
            <SubmitRow loading={loading} onClick={() => void handleCheer("GENERAL")} label="일반 응원 보내기" />
          </div>
        )}

        {tab === "TTS" && (
          <div className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">최소 {SUPPORT_MIN_AMOUNT.TTS.toLocaleString()} CP · 방송에서 AI 음성으로 읽습니다.</p>
            <Textarea
              placeholder="읽어줄 메시지 (필수, 120자)"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 120))}
              rows={3}
            />
            <SubmitRow loading={loading} onClick={() => void handleCheer("TTS")} label="TTS 응원 보내기" />
          </div>
        )}

        {tab === "SOUND" && (
          <div className="space-y-3 mt-3">
            <div className="grid grid-cols-3 gap-2">
              {SOUND_PRESETS.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  variant={soundId === s.id ? "default" : "outline"}
                  size="sm"
                  className="flex flex-col h-auto py-2 gap-0.5"
                  onClick={() => setSoundId(s.id)}
                >
                  <span className="text-lg">{s.emoji}</span>
                  <span className="text-[10px]">{s.label}</span>
                </Button>
              ))}
            </div>
            <SubmitRow loading={loading} onClick={() => void handleCheer("SOUND")} label="사운드 응원 보내기" />
          </div>
        )}

        {tab === "ROULETTE" && (
          <div className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              후원 시 랜덤 미션(노래·춤·벌칙 등)이 추첨되어 방송 화면에 표시됩니다.
            </p>
            <SubmitRow loading={loading} onClick={() => void handleCheer("ROULETTE")} label="룰렛 돌리기" />
          </div>
        )}

        {tab === "MISSION" && (
          <div className="space-y-3 mt-3">
            <Input
              placeholder='예: "이 판 이기면" (미션 내용)'
              value={missionTitle}
              onChange={(e) => setMissionTitle(e.target.value.slice(0, 120))}
            />
            <div className="flex flex-wrap gap-2">
              {[1_000, 3_000, 5_000, 10_000].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={missionReward === n ? "default" : "outline"}
                  onClick={() => setMissionReward(n)}
                >
                  {n.toLocaleString()} CP
                </Button>
              ))}
            </div>
            <SubmitRow loading={loading} onClick={() => void handleMission()} label="미션 등록 (예치)" />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
      </DialogContent>
    </Dialog>
  );
}

function AmountPicker({
  amount,
  custom,
  onAmount,
  onCustom,
  effectiveAmount,
}: {
  amount: number;
  custom: string;
  onAmount: (n: number) => void;
  onCustom: (s: string) => void;
  effectiveAmount: number;
}) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {CHEER_PRESETS.map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={!custom && amount === n ? "default" : "outline"}
            className="text-xs tabular-nums"
            onClick={() => {
              onCustom("");
              onAmount(n);
            }}
          >
            {n.toLocaleString()}
          </Button>
        ))}
      </div>
      <Input
        placeholder="직접 입력 CP"
        value={custom}
        onChange={(e) => onCustom(e.target.value.replace(/\D/g, "").slice(0, 8))}
        className="tabular-nums"
      />
      <p className="text-xs text-muted-foreground text-right tabular-nums">
        선택: <strong>{effectiveAmount.toLocaleString()} CP</strong>
      </p>
    </div>
  );
}

function SubmitRow({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <Button className="w-full" disabled={loading} onClick={onClick}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </Button>
  );
}
