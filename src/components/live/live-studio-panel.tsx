"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { LiveStreamCategory } from "@prisma/client";
import {
  Ban,
  Eye,
  Loader2,
  Pin,
  Send,
  Radio,
  Search,
  Shield,
  Trash2,
  Type,
  Users,
  Video,
} from "lucide-react";
import { BroadcastRoleBadge } from "@/components/live/broadcast-role-badge";
import { LiveRoomPageShell } from "@/components/live/live-room-page-shell";
import { ObsChatUrlCopy } from "@/components/live/obs-chat-url-copy";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  assignLiveStudioStaffAction,
  banLiveStudioViewerAction,
  listLiveStudioBansAction,
  listLiveStudioStaffAction,
  removeLiveStudioStaffAction,
  searchLiveStudioUsersAction,
  unbanLiveStudioViewerAction,
  updateLiveStudioSettings,
} from "@/actions/live-studio";
import { BROADCAST_PICK_CATEGORIES } from "@/lib/live-categories";
import {
  broadcastRoleLabel,
  type EffectiveBroadcastRole,
} from "@/lib/live-broadcast/permissions";
import { broadcastCategoryLabel } from "@/lib/live-category-i18n";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  isExternalLiveEnabled,
  isFirstPartyLiveEnabled,
} from "@/lib/live-feature";
import { cn } from "@/lib/utils";

type StudioInitial = {
  bio: string;
  announcement: string;
  scheduleNote: string;
  scheduleWeekdays: number[];
  scheduleTime: string;
  defaultTitle: string;
  defaultCategory: LiveStreamCategory;
};

type BanRow = {
  userId: string;
  username: string;
  image: string | null;
  bannedBy: string;
  reason: string | null;
  at: string;
};

type StaffRow = {
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  role: EffectiveBroadcastRole;
};

type SearchHit = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  currentRole: EffectiveBroadcastRole;
  isBanned: boolean;
};

const WEEKDAY_KEYS: { d: number; key: MessageKey }[] = [
  { d: 1, key: "live.weekday.mon" },
  { d: 2, key: "live.weekday.tue" },
  { d: 3, key: "live.weekday.wed" },
  { d: 4, key: "live.weekday.thu" },
  { d: 5, key: "live.weekday.fri" },
  { d: 6, key: "live.weekday.sat" },
  { d: 0, key: "live.weekday.sun" },
];

export function LiveStudioPanel({
  initial,
  overlayUrls,
}: {
  initial: StudioInitial;
  overlayUrls?: { chat: string; video: string; chatTip: string } | null;
}) {
  const { locale, t } = useLocale();
  const firstPartyOn = isFirstPartyLiveEnabled();
  const externalOn = isExternalLiveEnabled();
  const goLiveHref = firstPartyOn ? "/voice/new" : "/live/external/new";

  const [category, setCategory] = useState<LiveStreamCategory>(
    initial.defaultCategory === "VIRTUAL" ? "JUST_CHATTING" : initial.defaultCategory
  );
  const [announcement, setAnnouncement] = useState(initial.announcement);
  const [bio, setBio] = useState(initial.bio);
  const [scheduleNote, setScheduleNote] = useState(initial.scheduleNote);
  const [scheduleWeekdays, setScheduleWeekdays] = useState<number[]>(
    initial.scheduleWeekdays ?? []
  );
  const [scheduleTime, setScheduleTime] = useState(initial.scheduleTime ?? "");
  const [settingsMsg, setSettingsMsg] = useState("");
  const [settingsPending, startSettings] = useTransition();

  const [bans, setBans] = useState<BanRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [banQuery, setBanQuery] = useState("");
  const [staffQuery, setStaffQuery] = useState("");
  const [banHits, setBanHits] = useState<SearchHit[]>([]);
  const [staffHits, setStaffHits] = useState<SearchHit[]>([]);
  const [actionError, setActionError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"director" | "chat">("director");

  const reloadLists = useCallback(async () => {
    setListsLoading(true);
    try {
      const [banList, staffList] = await Promise.all([
        listLiveStudioBansAction(),
        listLiveStudioStaffAction(),
      ]);
      setBans(banList);
      setStaff(staffList);
    } finally {
      setListsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadLists();
  }, [reloadLists]);

  function saveSettings() {
    setSettingsMsg("");
    startSettings(async () => {
      await updateLiveStudioSettings({
        defaultCategory: category,
        announcement,
        bio,
        scheduleNote,
        scheduleWeekdays,
        scheduleTime,
      });
      setSettingsMsg(t("live.studio.settingsSaved"));
    });
  }

  function toggleWeekday(day: number) {
    setScheduleWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  async function searchBans() {
    setActionError("");
    const hits = await searchLiveStudioUsersAction(banQuery);
    setBanHits(hits);
  }

  async function searchStaff() {
    setActionError("");
    const hits = await searchLiveStudioUsersAction(staffQuery);
    setStaffHits(hits);
  }

  async function banUser(userId: string) {
    setBusy(true);
    setActionError("");
    setActionMsg("");
    const res = await banLiveStudioViewerAction(userId);
    setBusy(false);
    if ("error" in res && res.error) {
      setActionError(errorText(res.error));
      return;
    }
    setActionMsg(t("live.studio.viewerBanned"));
    setBanHits([]);
    setBanQuery("");
    void reloadLists();
  }

  async function unbanUser(userId: string) {
    setBusy(true);
    setActionError("");
    const res = await unbanLiveStudioViewerAction(userId);
    setBusy(false);
    if ("error" in res && res.error) {
      setActionError(errorText(res.error));
      return;
    }
    void reloadLists();
  }

  async function assignStaff(userId: string) {
    setBusy(true);
    setActionError("");
    setActionMsg("");
    const res = await assignLiveStudioStaffAction(userId, "MANAGER");
    setBusy(false);
    if ("error" in res && res.error) {
      setActionError(errorText(res.error));
      return;
    }
    setActionMsg(t("live.studio.staffAssigned"));
    setStaffHits([]);
    setStaffQuery("");
    void reloadLists();
  }

  async function removeStaff(userId: string) {
    setBusy(true);
    setActionError("");
    const res = await removeLiveStudioStaffAction(userId);
    setBusy(false);
    if ("error" in res && res.error) {
      setActionError(errorText(res.error));
      return;
    }
    void reloadLists();
  }

  const directorPanel = (
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background/95">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-folk-cobalt/5 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-wide text-folk-cobalt">
                {t("live.director.title")}
              </p>
              <p className="text-[10px] text-muted-foreground">{t("live.director.subtitle")}</p>
            </div>
          </header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2.5">
        <ObsChatUrlCopy variant="full" initialUrls={overlayUrls} />

        {actionError ? (
          <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
            {actionError}
          </p>
        ) : null}
        {actionMsg ? (
          <p className="text-sm text-folk-cobalt rounded-xl border border-folk-cobalt/25 bg-folk-cobalt/5 px-3 py-2">
            {actionMsg}
          </p>
        ) : null}

        <section className="rounded-xl border border-border/70 bg-card/80 p-3 sm:p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-folk-terracotta" />
            <h2 className="font-display font-bold text-folk-cobalt">{t("live.studio.basicSettings")}</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">{t("live.studio.basicSettingsDesc")}</p>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">{t("live.studio.category")}</label>
            <div className="flex flex-wrap gap-2">
              {BROADCAST_PICK_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                    category === c.value
                      ? "border-folk-terracotta bg-folk-terracotta/15 text-folk-terracotta"
                      : "border-border/70 text-muted-foreground hover:border-folk-cobalt/40"
                  )}
                >
                  {broadcastCategoryLabel(locale, c.value)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Pin className="h-3.5 w-3.5" />
              {t("live.studio.pinnedMessage")}
            </label>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("live.studio.pinnedPlaceholder")}
              className="rounded-xl mt-1 w-full min-h-[80px] border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{t("live.studio.channelBio")}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={2}
              className="rounded-xl mt-1 w-full min-h-[64px] border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{t("live.studio.weeklyDays")}</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAY_KEYS.map((w) => (
                <button
                  key={w.d}
                  type="button"
                  onClick={() => toggleWeekday(w.d)}
                  className={cn(
                    "h-9 w-9 rounded-xl border text-sm font-bold transition-colors",
                    scheduleWeekdays.includes(w.d)
                      ? "border-emerald-600 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "border-border/70 text-muted-foreground hover:border-emerald-500/50"
                  )}
                >
                  {t(w.key)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{t("live.studio.startTime")}</label>
            <Input
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              placeholder="21:00"
              inputMode="numeric"
              maxLength={5}
              className="rounded-xl mt-1 max-w-[8rem] font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{t("live.studio.scheduleMemo")}</label>
            <textarea
              value={scheduleNote}
              onChange={(e) => setScheduleNote(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder={t("live.studio.scheduleMemoPlaceholder")}
              className="rounded-xl mt-1 w-full min-h-[88px] border border-input bg-background px-3 py-2 text-sm whitespace-pre-wrap"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{t("live.studio.scheduleMemoHint")}</p>
          </div>

          <Button
            className="w-full sm:w-auto rounded-xl"
            onClick={saveSettings}
            disabled={settingsPending}
          >
            {settingsPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("live.studio.saveSettings")}
          </Button>
          {settingsMsg ? (
            <p className="text-xs text-muted-foreground">{settingsMsg}</p>
          ) : null}
        </section>

        <section className="rounded-xl border border-border/70 bg-card/80 p-3 sm:p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-folk-cobalt" />
              <h2 className="font-display font-bold text-folk-cobalt">{t("live.studio.staffTitle")}</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">{t("live.studio.staffDesc")}</p>

            <div className="flex gap-2">
              <Input
                value={staffQuery}
                onChange={(e) => setStaffQuery(e.target.value)}
                placeholder={t("live.studio.staffSearch")}
                className="rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void searchStaff();
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-xl shrink-0"
                onClick={() => void searchStaff()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {staffHits.length > 0 ? (
              <div className="space-y-2">
                {staffHits.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-2 rounded-xl border border-border/60 p-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={h.image ?? undefined} />
                      <AvatarFallback>{h.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">@{h.username}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {broadcastRoleLabel(locale, h.currentRole)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-lg"
                      disabled={busy || h.currentRole === "OWNER"}
                      onClick={() => void assignStaff(h.id)}
                    >
                      {t("live.studio.assign")}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            {listsLoading ? (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {staff.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center gap-2 rounded-xl border border-border/60 p-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.image ?? undefined} />
                      <AvatarFallback>{m.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">@{m.username}</p>
                      <BroadcastRoleBadge role={m.role} />
                    </div>
                    {m.role !== "OWNER" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={busy}
                        onClick={() => void removeStaff(m.userId)}
                        aria-label={t("live.studio.removeRole")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

        <section className="rounded-xl border border-border/70 bg-card/80 p-3 sm:p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-folk-terracotta" />
              <h2 className="font-display font-bold text-folk-cobalt">{t("live.studio.bansTitle")}</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">{t("live.studio.bansDesc")}</p>

            <div className="flex gap-2">
              <Input
                value={banQuery}
                onChange={(e) => setBanQuery(e.target.value)}
                placeholder={t("live.studio.banSearch")}
                className="rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void searchBans();
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-xl shrink-0"
                onClick={() => void searchBans()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {banHits.length > 0 ? (
              <div className="space-y-2">
                {banHits.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-2 rounded-xl border border-border/60 p-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={h.image ?? undefined} />
                      <AvatarFallback>{h.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">@{h.username}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {h.isBanned ? t("live.studio.alreadyBanned") : broadcastRoleLabel(locale, h.currentRole)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-lg"
                      disabled={busy || h.currentRole === "OWNER" || h.isBanned}
                      onClick={() => void banUser(h.id)}
                    >
                      {t("live.studio.ban")}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            {listsLoading ? (
              <div className="flex justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : bans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                {t("live.studio.noBans")}
              </p>
            ) : (
              <div className="space-y-2">
                {bans.map((b) => (
                  <div
                    key={b.userId}
                    className="flex items-center gap-2 rounded-xl border border-border/60 p-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={b.image ?? undefined} />
                      <AvatarFallback>{b.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">@{b.username}</p>
                      <p className="text-[11px] text-muted-foreground">
                        @{b.bannedBy} · {new Date(b.at).toLocaleDateString("ko-KR")}
                        {b.reason ? ` · ${b.reason}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      disabled={busy}
                      onClick={() => void unbanUser(b.userId)}
                    >
                      {t("live.studio.unban")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
        </section>
          </div>
        </div>
  );

  const chatOfflinePanel = (
    <div className="flex h-full min-h-[min(70vh,560px)] flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-2.5">
        <span className="text-sm font-semibold">{t("live.chat.title")}</span>
        <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          0
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-xs text-muted-foreground">{t("live.studio.chatOffline")}</p>
      </div>
      <div className="shrink-0 border-t border-border/60 p-2.5">
        <div className="flex gap-2">
          <Input
            disabled
            placeholder={t("live.sdp6wzr")}
            className="h-9 flex-1 rounded-lg text-sm"
          />
          <Button
            size="sm"
            disabled
            className="h-9 shrink-0 rounded-lg bg-folk-terracotta px-3 hover:bg-folk-terracotta/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <LiveRoomPageShell isHost>
      <div className="flex w-full flex-col lg:h-[calc(100dvh-4.75rem)]">
        <header className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 bg-background/95 py-2 backdrop-blur-sm sm:gap-3">
          <span className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-200">
            <Radio className="h-3 w-3" />
            {t("live.studio.offline")}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
            {broadcastCategoryLabel(locale, category)}
          </span>
          <h1 className="min-w-0 flex-1 truncate text-base font-bold sm:text-lg">
            {t("live.studio.title")}
          </h1>
          <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
            <Eye className="h-4 w-4" />
            0
          </span>
          {(firstPartyOn || externalOn) && (
            <Button asChild size="sm" className="gap-1 rounded-xl">
              <Link href={goLiveHref}>
                <Video className="h-4 w-4" />
                {t("live.studio.goLive")}
              </Link>
            </Button>
          )}
        </header>

        <div className="mt-2 flex shrink-0 gap-1 rounded-lg border border-border/60 bg-muted/40 p-1 lg:hidden">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold",
              tab === "director" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => setTab("director")}
          >
            {t("live.director.tabDirector")}
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold",
              tab === "chat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => setTab("chat")}
          >
            {t("live.director.tabChat")}
          </button>
        </div>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.95fr)_minmax(300px,0.9fr)]">
          <section className="min-w-0">
            <div className="relative aspect-video w-full min-h-[220px] overflow-hidden rounded-xl bg-black ring-1 ring-border/40 lg:aspect-auto lg:h-full lg:min-h-0">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                <Radio className="h-10 w-10 text-white/25" />
                <p className="text-sm font-semibold text-white/50">{t("live.studio.offline")}</p>
                <p className="text-xs text-white/35">{t("live.studio.previewHint")}</p>
              </div>
            </div>
          </section>

          <aside
            className={cn(
              "min-h-[360px] lg:h-full lg:min-h-0",
              tab === "director" ? "block" : "hidden lg:block",
            )}
          >
            {directorPanel}
          </aside>
          <aside
            className={cn(
              "h-[min(70vh,560px)] lg:h-full",
              tab === "chat" ? "block" : "hidden lg:block",
            )}
          >
            {chatOfflinePanel}
          </aside>
        </div>
      </div>
    </LiveRoomPageShell>
  );
}
