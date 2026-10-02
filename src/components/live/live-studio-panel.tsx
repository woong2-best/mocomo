"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { LiveStreamCategory } from "@prisma/client";
import {
  Ban,
  Loader2,
  Pin,
  Radio,
  Search,
  Shield,
  Trash2,
  Type,
  Users,
  Video,
} from "lucide-react";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { BroadcastRoleBadge } from "@/components/live/broadcast-role-badge";
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

export function LiveStudioPanel({ initial }: { initial: StudioInitial }) {
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
      setActionError(res.error);
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
      setActionError(res.error);
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
      setActionError(res.error);
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
      setActionError(res.error);
      return;
    }
    void reloadLists();
  }

  return (
    <div className="live-page-shell w-full max-w-none space-y-4 sm:space-y-5 pb-nav lg:pb-6 min-h-[calc(100dvh-var(--header-h))]">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5">
        <header className="live-hero flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-folk-terracotta/30 bg-folk-terracotta/15 text-folk-terracotta shrink-0">
            <Radio className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="folk-tag mb-1.5 w-fit">{t("live.studio.tag")}</p>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-folk-cobalt folk-chunky-text">
              {t("live.studio.title")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("live.studio.desc")}</p>
            <Link
              href="/live"
              className="mt-2 inline-flex text-xs font-semibold text-muted-foreground hover:text-folk-cobalt transition-colors"
            >
              {t("live.studio.backToLive")}
            </Link>
          </div>
          {(firstPartyOn || externalOn) && (
            <Button asChild className="rounded-xl gap-2 shrink-0">
              <Link href={goLiveHref}>
                <Video className="h-4 w-4" />
                {t("live.studio.goLive")}
              </Link>
            </Button>
          )}
        </header>

        <FolkBrushDivider className="opacity-50" />

        <ObsChatUrlCopy variant="full" />

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

        <section className="folk-card p-4 sm:p-5 space-y-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="folk-card p-4 sm:p-5 space-y-4">
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

          <section className="folk-card p-4 sm:p-5 space-y-4">
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
    </div>
  );
}
