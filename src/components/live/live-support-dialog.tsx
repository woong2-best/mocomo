"use client";


import { errorText } from "@/lib/i18n/error-text";
import { useLocale } from "@/components/providers/locale-provider";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState, type ReactNode } from "react";
import type { LiveSupportEventType } from "@prisma/client";
import {
  Gift,
  Loader2,
  RotateCw,
  Target,
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
  SUPPORT_MIN_AMOUNT,
} from "@/lib/live-support/types";
import {
  createLiveMission,
  sendLiveSupport,
} from "@/hooks/use-live-support-socket";
import type { Socket } from "socket.io-client";

const TABS: { id: LiveSupportEventType | "MISSION"; label: string; icon: ReactNode }[] = [
  { id: "GENERAL", label: t("live.syyos"), icon: <Gift className="h-3.5 w-3.5" /> },
  { id: "ROULETTE", label: t("live.swgtn"), icon: <RotateCw className="h-3.5 w-3.5" /> },
  { id: "MISSION", label: t("live.sx17k"), icon: <Target className="h-3.5 w-3.5" /> },
];

export function LiveSupportDialog({
  channelId,
  hostDisplayName,
  socket,
  connected,
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName,
  trigger,
  triggerLabel = t("live.sn24kge"),
  initialTab = "GENERAL",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  channelId: string;
  hostDisplayName: string;
  socket: Socket | null;
  connected: boolean;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "icon";
  triggerClassName?: string;
  trigger?: ReactNode;
  triggerLabel?: string;
  initialTab?: LiveSupportEventType | "MISSION";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [tab, setTab] = useState<string>(initialTab);
  const [amount, setAmount] = useState(1_000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
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
      setError(t("live.s1a0tk2l", { v0: min.toLocaleString() }));
      setLoading(false);
      return;
    }
    const res = await sendLiveSupport(socket, {
      channelId,
      type,
      amount: effectiveAmount,
      message: message.trim() || undefined,
      metadata: undefined,
    });
    setLoading(false);
    if (!res.ok) {
      setError(errorText(res.error ?? t("live.syb44")));
      return;
    }
    setSuccess(t("live.s1ae1nmb"));
    setMessage("");
    setTimeout(() => setOpen(false), 800);
  }

  async function handleMission() {
    setError("");
    setSuccess("");
    if (!missionTitle.trim()) {
      setError(t("live.s1wp22z7"));
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
      setError(errorText(res.error ?? t("live.syb44")));
      return;
    }
    setSuccess(t("live.s1x7mii4"));
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
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button variant={triggerVariant} size={triggerSize} className={triggerClass} disabled={!connected}>
            <Gift className="h-4 w-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("live.s1npy0j4")}</DialogTitle>
          <DialogDescription>
            {t("live.supportCheer.desc1", { host: hostDisplayName })}{" "}
            {t("live.supportCheer.desc2")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-1">
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
              placeholder={t("live.s181sazx")}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 100))}
              rows={2}
            />
            <SubmitRow loading={loading} onClick={() => void handleCheer("GENERAL")} label={t("live.s1kzz3ar")} />
          </div>
        )}

        {tab === "ROULETTE" && (
          <div className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              {t("live.s1r4blwm")}
            </p>
            <SubmitRow loading={loading} onClick={() => void handleCheer("ROULETTE")} label={t("live.s1fpxgez")} />
          </div>
        )}

        {tab === "MISSION" && (
          <div className="space-y-3 mt-3">
            <Input
              placeholder={t("live.se0i2gm")}
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
            <SubmitRow loading={loading} onClick={() => void handleMission()} label={t("live.sah9af9")} />
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
        placeholder={t("live.s18qvfh")}
        value={custom}
        onChange={(e) => onCustom(e.target.value.replace(/\D/g, "").slice(0, 8))}
        className="tabular-nums"
      />
      <p className="text-xs text-muted-foreground text-right tabular-nums">
        {t("live.st9vdp")} <strong>{effectiveAmount.toLocaleString()} CP</strong>
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
