"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState, useTransition } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateLiveStreamSettings } from "@/actions/live-stream";
import { updateLiveChatSettingsAction } from "@/actions/broadcast-roles";
import { SUPPORT_TIERS } from "@/lib/tiers";
import { ensureStringArray } from "@/lib/ensure-array";
import type { SupportTierLevel } from "@prisma/client";

function ChatSettingsForm({
  channelId,
  initialSlow,
  initialBanned,
  initialFollowersOnly,
  initialSubscribersOnly,
  initialTierExempt,
}: {
  channelId: string;
  initialSlow: number;
  initialBanned: string[];
  initialFollowersOnly?: boolean;
  initialSubscribersOnly?: boolean;
  initialTierExempt?: SupportTierLevel | null;
}) {
  const { t } = useLocale();
  const safeBanned = ensureStringArray(initialBanned);
  const [slow, setSlow] = useState(String(initialSlow));
  const [words, setWords] = useState(safeBanned.join(", "));
  const [followersOnly, setFollowersOnly] = useState(!!initialFollowersOnly);
  const [subscribersOnly, setSubscribersOnly] = useState(!!initialSubscribersOnly);
  const [tierExempt, setTierExempt] = useState(initialTierExempt ?? "");
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    setMsg("");
    startTransition(async () => {
      const res = await updateLiveChatSettingsAction(channelId, {
        slowModeSeconds: parseInt(slow, 10) || 0,
        chatBannedWords: words
          .split(/[,，]/)
          .map((w) => w.trim())
          .filter(Boolean)
          .slice(0, 30),
        chatFollowersOnly: followersOnly,
        chatSubscribersOnly: subscribersOnly,
        chatMinTierExempt: tierExempt ? (tierExempt as SupportTierLevel) : null,
      });
      if ("error" in res && res.error) setMsg(res.error);
      else setMsg(t("live.s12la3bm"));
    });
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="text-xs text-muted-foreground">{t("live.s2qr0w2")}</label>
        <Input
          value={slow}
          onChange={(e) => setSlow(e.target.value)}
          type="number"
          min={0}
          max={120}
          className="rounded-xl mt-1"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">{t("live.s2irgo8")}</label>
        <Input
          value={words}
          onChange={(e) => setWords(e.target.value)}
          className="rounded-xl mt-1"
          placeholder={t("live.s139bsuw")}
        />
      </div>
      <div className="rounded-xl border border-border/60 p-3 space-y-2">
        <p className="text-xs font-semibold">{t("live.s17z6g3j")}</p>
        <label className="text-xs flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={followersOnly} onChange={(e) => setFollowersOnly(e.target.checked)} />
          {t("live.s1i8ly55")}
        </label>
        <label className="text-xs flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={subscribersOnly} onChange={(e) => setSubscribersOnly(e.target.checked)} />
          {t("live.s1xsry3w")}
        </label>
        <div>
          <label className="text-xs text-muted-foreground">{t("live.s5caalm")}</label>
          <select
            className="w-full mt-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
            value={tierExempt}
            onChange={(e) => setTierExempt(e.target.value)}
          >
            <option value="">{t("settings.none")}</option>
            {SUPPORT_TIERS.map((t) => (
              <option key={t.level} value={t.level}>
                {t.labelKo} ({t.label})
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button className="w-full rounded-xl" onClick={save} disabled={pending}>
        {t("live.s1qjzmd")}
      </Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

function HostSettingsForm({
  channelId,
  initialSlow,
  initialBanned,
  initialCollabSplit,
  initialDonationAlertsOnStream,
  initialIsNsfw,
  collabCoHostName,
}: {
  channelId: string;
  initialSlow: number;
  initialBanned: string[];
  initialCollabSplit?: boolean;
  initialDonationAlertsOnStream?: boolean;
  initialIsNsfw?: boolean;
  collabCoHostName?: string | null;
}) {
  const safeBanned = ensureStringArray(initialBanned);
  const [slow, setSlow] = useState(String(initialSlow));
  const [words, setWords] = useState(safeBanned.join(", "));
  const [collabSplit, setCollabSplit] = useState(!!initialCollabSplit);
  const [donationAlertsOnStream, setDonationAlertsOnStream] = useState(
    !!initialDonationAlertsOnStream
  );
  const [isNsfw, setIsNsfw] = useState(!!initialIsNsfw);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    setMsg("");
    startTransition(async () => {
      const res = await updateLiveStreamSettings(channelId, {
        slowModeSeconds: parseInt(slow, 10) || 0,
        chatBannedWords: words
          .split(/[,，]/)
          .map((w) => w.trim())
          .filter(Boolean)
          .slice(0, 30),
        liveCollabSplitEnabled: collabSplit,
        donationAlertsOnStream,
        isNsfw,
        contentRating: isNsfw ? "ADULT" : "GENERAL",
      });
      if ("error" in res && res.error) setMsg(res.error);
      else setMsg(t("live.s12la3bm"));
    });
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl border border-red-500/35 bg-red-500/5 p-3 space-y-2">
        <p className="text-xs font-semibold text-red-900 dark:text-red-100">{t("live.s16d8wwk")}</p>
        <label className="text-xs flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={isNsfw}
            onChange={(e) => setIsNsfw(e.target.checked)}
          />
          <span>
            {t("live.s1ll6o33")}
            <span className="block text-[10px] text-muted-foreground mt-1 leading-snug">
              {t("live.sb27om3")}
            </span>
          </span>
        </label>
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">{t("live.scglcec")}</p>
        <label className="text-xs flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={donationAlertsOnStream}
            onChange={(e) => setDonationAlertsOnStream(e.target.checked)}
          />
          <span>
            {t("live.s19dsuy0")}
            <span className="block text-[10px] text-muted-foreground mt-1 leading-snug">
              {t("live.obs_3")}
            </span>
          </span>
        </label>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">{t("live.s2qr0w2")}</label>
        <Input
          value={slow}
          onChange={(e) => setSlow(e.target.value)}
          type="number"
          min={0}
          max={120}
          className="rounded-xl mt-1"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">{t("live.s2irgo8")}</label>
        <Input
          value={words}
          onChange={(e) => setWords(e.target.value)}
          className="rounded-xl mt-1"
          placeholder={t("live.s139bsuw")}
        />
      </div>
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
        <p className="text-xs font-semibold text-violet-800 dark:text-violet-200">{t("live.s1lmuj38")}</p>
        <label className="text-xs flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={collabSplit}
            onChange={(e) => setCollabSplit(e.target.checked)}
          />
          {t("live.swjz3q1")}
        </label>
        {collabCoHostName && (
          <p className="text-[11px] text-muted-foreground">합방 중: {collabCoHostName}</p>
        )}
        <p className="text-[10px] text-muted-foreground leading-snug">
          {t("live.s138hsru")}
        </p>
      </div>
      <Button className="w-full rounded-xl" onClick={save} disabled={pending}>
        {t("live.s1y4ohis")}
      </Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

export function LiveHostSettings({
  channelId,
  slowModeSeconds: initialSlow,
  bannedWords: initialBanned,
  initialCollabSplit,
  initialDonationAlertsOnStream,
  initialIsNsfw,
  collabCoHostName,
  chatSettingsOnly,
  initialFollowersOnly,
  initialSubscribersOnly,
  initialTierExempt,
  embedded,
}: {
  channelId: string;
  slowModeSeconds: number;
  bannedWords: string[];
  initialCollabSplit?: boolean;
  initialDonationAlertsOnStream?: boolean;
  initialIsNsfw?: boolean;
  collabCoHostName?: string | null;
  chatSettingsOnly?: boolean;
  initialFollowersOnly?: boolean;
  initialSubscribersOnly?: boolean;
  initialTierExempt?: SupportTierLevel | null;
  embedded?: boolean;
}) {
  if (chatSettingsOnly) {
    return (
      <ChatSettingsForm
        channelId={channelId}
        initialSlow={initialSlow}
        initialBanned={initialBanned}
        initialFollowersOnly={initialFollowersOnly}
        initialSubscribersOnly={initialSubscribersOnly}
        initialTierExempt={initialTierExempt}
      />
    );
  }

  if (embedded) {
    return (
      <HostSettingsForm
        channelId={channelId}
        initialSlow={initialSlow}
        initialBanned={initialBanned}
        initialCollabSplit={initialCollabSplit}
        initialDonationAlertsOnStream={initialDonationAlertsOnStream}
        initialIsNsfw={initialIsNsfw}
        collabCoHostName={collabCoHostName}
      />
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-1">
          <Settings2 className="h-4 w-4" />
          {t("live.s1duasqh")}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>{t("live.smlgf7g")}</DialogTitle>
        </DialogHeader>
        <HostSettingsForm
          channelId={channelId}
          initialSlow={initialSlow}
          initialBanned={initialBanned}
          initialCollabSplit={initialCollabSplit}
          initialDonationAlertsOnStream={initialDonationAlertsOnStream}
          initialIsNsfw={initialIsNsfw}
          collabCoHostName={collabCoHostName}
        />
      </DialogContent>
    </Dialog>
  );
}
