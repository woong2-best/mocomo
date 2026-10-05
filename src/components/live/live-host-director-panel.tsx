"use client";

import { errorText } from "@/lib/i18n/error-text";
import { useLocale } from "@/components/providers/locale-provider";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Ban,
  Clock,
  Gem,
  Link2,
  Pin,
  Search,
  Settings2,
  Shield,
  Trophy,
  UserCog,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ObsChatUrlCopy } from "@/components/live/obs-chat-url-copy";
import { LiveHostSettings } from "@/components/live/live-host-settings";
import { LiveRoleManagementPanel } from "@/components/live/live-role-management-panel";
import { LiveChatBansPanel } from "@/components/live/live-chat-bans-panel";
import { VideoDonationRoomControls } from "@/components/live/video-donation-room-controls";
import {
  getLiveStudioSettings,
  searchLiveStudioUsersAction,
  banLiveStudioViewerAction,
  updateLiveStudioSettings,
} from "@/actions/live-studio";
import {
  banLiveChatUserAction,
  timeoutLiveChatUserAction,
} from "@/actions/broadcast-roles";
import { ensureStringArray } from "@/lib/ensure-array";
import { formatCentiAsMoco } from "@/lib/moco-donation/video-pricing";
import { formatUsd } from "@/lib/money";
import { cn } from "@/lib/utils";

type DonorRow = { username: string; mocoCenti: number };
type SearchHit = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  currentRole: string;
  isBanned: boolean;
};

function mocoLabel(centi: number) {
  return `${formatCentiAsMoco(centi)} MOCO`;
}

function DirectorSection({
  icon: Icon,
  title,
  hint,
  defaultOpen = true,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="group rounded-xl border border-border/70 bg-card/80"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <Icon className="h-3.5 w-3.5 shrink-0 text-folk-cobalt" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-foreground">{title}</p>
          {hint ? (
            <p className="text-[10px] leading-snug text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span className="text-[10px] text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      {open ? (
        <div className="space-y-2 border-t border-border/60 px-3 py-3">{children}</div>
      ) : null}
    </details>
  );
}

export function LiveHostDirectorPanel({
  channelId,
  viewerCount,
  donationGoalKrw,
  tipTotalKrw = 0,
  slowModeSeconds,
  chatBannedWords,
  donationAlertsOnStream,
  isNsfw,
  onPinnedChange,
}: {
  channelId: string;
  viewerCount?: number;
  donationGoalKrw?: number | null;
  tipTotalKrw?: number;
  slowModeSeconds?: number;
  chatBannedWords?: string[];
  donationAlertsOnStream?: boolean;
  isNsfw?: boolean;
  onPinnedChange?: (message: string) => void;
}) {
  const { t } = useLocale();
  const [mocoTotalCenti, setMocoTotalCenti] = useState(0);
  const [donors, setDonors] = useState<DonorRow[]>([]);
  const [pin, setPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const [pinPending, startPin] = useTransition();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [modMsg, setModMsg] = useState("");
  const [modBusy, setModBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const settings = await getLiveStudioSettings();
        if (!cancelled && settings?.announcement != null) {
          setPin(settings.announcement);
          onPinnedChange?.(settings.announcement);
        }
      } catch {
        /* host-only action; ignore guests */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Load pin once on mount; parent callback is stable enough for first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${channelId}/stats`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok || !body.ok) return;
      setMocoTotalCenti(typeof body.mocoTotalCenti === "number" ? body.mocoTotalCenti : 0);
      setDonors(Array.isArray(body.mocoRanking) ? body.mocoRanking : []);
    } catch {
      /* ignore */
    }
  }, [channelId]);

  useEffect(() => {
    void refreshStats();
    const id = setInterval(() => void refreshStats(), 4000);
    return () => clearInterval(id);
  }, [refreshStats]);

  function savePin(next: string) {
    setPinMsg("");
    startPin(async () => {
      const res = await updateLiveStudioSettings({ announcement: next });
      if ("error" in res && res.error) {
        setPinMsg(errorText(String(res.error)));
        return;
      }
      onPinnedChange?.(next.trim());
      setPinMsg(next.trim() ? t("live.director.pinSaved") : t("live.director.pinSaved"));
    });
  }

  async function searchViewers() {
    const q = query.trim();
    if (!q) return;
    setModMsg("");
    setModBusy(true);
    try {
      const rows = await searchLiveStudioUsersAction(q);
      setHits(Array.isArray(rows) ? rows : []);
      if (!Array.isArray(rows) || rows.length === 0) {
        setModMsg(t("live.director.noSearchHits"));
      }
    } catch (e) {
      setHits([]);
      setModMsg(e instanceof Error ? e.message : t("live.director.noSearchHits"));
    } finally {
      setModBusy(false);
    }
  }

  async function kickUser(userId: string) {
    setModBusy(true);
    setModMsg("");
    const res = await timeoutLiveChatUserAction(channelId, userId, 300);
    setModBusy(false);
    if ("error" in res && res.error) setModMsg(errorText(res.error));
  }

  async function banUser(userId: string) {
    setModBusy(true);
    setModMsg("");
    const room = await banLiveChatUserAction(channelId, userId);
    if ("error" in room && room.error) {
      setModBusy(false);
      setModMsg(errorText(room.error));
      return;
    }
    const studio = await banLiveStudioViewerAction(userId);
    setModBusy(false);
    if ("error" in studio && studio.error) setModMsg(errorText(studio.error));
    else setHits((prev) => prev.map((h) => (h.id === userId ? { ...h, isBanned: true } : h)));
  }

  const goalCenti =
    donationGoalKrw && donationGoalKrw > 0
      ? Math.round(donationGoalKrw / 5)
      : 0;
  const goalPct =
    goalCenti > 0 ? Math.min(100, Math.round((mocoTotalCenti / goalCenti) * 100)) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background/95">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-folk-cobalt/5 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-folk-cobalt">
            {t("live.director.title")}
          </p>
          <p className="text-[10px] text-muted-foreground">{t("live.director.subtitle")}</p>
        </div>
        {typeof viewerCount === "number" ? (
          <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {t("live.director.watching", { count: String(viewerCount) })}
          </span>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
        <section className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-folk-terracotta/5 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
            <Gem className="h-3.5 w-3.5" />
            {t("live.director.thisStream")}
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {mocoLabel(mocoTotalCenti)}
          </p>
          <p className="text-[10px] text-muted-foreground">{t("live.director.raisedHint")}</p>
          {goalCenti > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("live.director.goal")}</span>
                <span className="tabular-nums">
                  {mocoLabel(mocoTotalCenti)} / {mocoLabel(goalCenti)} ({goalPct}%)
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background/80">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-folk-terracotta transition-all"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              {tipTotalKrw > 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  {formatUsd(tipTotalKrw)}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <DirectorSection
          icon={Trophy}
          title={t("live.director.topDonors")}
          hint={t("live.director.topDonorsHint")}
        >
          {donors.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              {t("live.director.noTopDonors")}
            </p>
          ) : (
            <ol className="space-y-1.5">
              {donors.map((d, i) => (
                <li
                  key={`${d.username}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2 py-1.5"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold tabular-nums",
                      i === 0
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        : i === 1
                          ? "bg-slate-400/20 text-slate-600 dark:text-slate-300"
                          : i === 2
                            ? "bg-orange-700/15 text-orange-800 dark:text-orange-300"
                            : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    @{d.username}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-folk-cobalt">
                    {mocoLabel(d.mocoCenti)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </DirectorSection>

        <DirectorSection
          icon={Gem}
          title={t("live.director.queue")}
          hint={t("live.director.queueHint")}
        >
          <VideoDonationRoomControls channelId={channelId} isHost />
        </DirectorSection>

        <DirectorSection
          icon={Pin}
          title={t("live.director.pin")}
          hint={t("live.director.pinHint")}
        >
          <textarea
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t("live.director.pinPlaceholder")}
            className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 flex-1 rounded-lg"
              disabled={pinPending}
              onClick={() => savePin(pin)}
            >
              {t("live.director.pinSave")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg"
              disabled={pinPending || !pin.trim()}
              onClick={() => {
                setPin("");
                savePin("");
              }}
            >
              {t("live.director.pinClear")}
            </Button>
          </div>
          {pinMsg ? <p className="text-[11px] text-muted-foreground">{pinMsg}</p> : null}
        </DirectorSection>

        <DirectorSection
          icon={Link2}
          title={t("live.director.overlays")}
          defaultOpen
        >
          <ObsChatUrlCopy channelId={channelId} variant="full" className="border-0 bg-transparent p-0" />
        </DirectorSection>

        <DirectorSection
          icon={Shield}
          title={t("live.director.moderation")}
          hint={t("live.director.moderationHint")}
          defaultOpen
        >
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("live.director.searchViewer")}
              className="h-8 rounded-lg text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") void searchViewers();
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg"
              disabled={modBusy}
              onClick={() => void searchViewers()}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
          {hits.length > 0 ? (
            <ul className="space-y-1.5">
              {hits.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 p-1.5"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={h.image ?? undefined} />
                    <AvatarFallback>{h.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">@{h.username}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {h.isBanned ? t("live.studio.alreadyBanned") : h.currentRole}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 rounded-md px-2 text-[10px]"
                    disabled={modBusy || h.currentRole === "OWNER" || h.isBanned}
                    title={t("live.director.kickHint")}
                    onClick={() => void kickUser(h.id)}
                  >
                    <Clock className="h-3 w-3" />
                    {t("live.director.kick")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 gap-1 rounded-md px-2 text-[10px]"
                    disabled={modBusy || h.currentRole === "OWNER" || h.isBanned}
                    onClick={() => void banUser(h.id)}
                  >
                    <Ban className="h-3 w-3" />
                    {t("live.director.ban")}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          {modMsg ? <p className="text-[11px] text-muted-foreground">{modMsg}</p> : null}
          <p className="pt-1 text-[10px] font-semibold text-muted-foreground">
            {t("live.director.banned")}
          </p>
          <LiveChatBansPanel channelId={channelId} />
        </DirectorSection>

        <DirectorSection
          icon={Settings2}
          title={t("live.director.settings")}
          defaultOpen={false}
        >
          <LiveHostSettings
            channelId={channelId}
            slowModeSeconds={slowModeSeconds ?? 0}
            bannedWords={ensureStringArray(chatBannedWords)}
            initialDonationAlertsOnStream={donationAlertsOnStream}
            initialIsNsfw={isNsfw}
            embedded
          />
        </DirectorSection>

        <DirectorSection
          icon={UserCog}
          title={t("live.director.roles")}
          defaultOpen={false}
        >
          <LiveRoleManagementPanel channelId={channelId} />
        </DirectorSection>
      </div>
    </div>
  );
}
