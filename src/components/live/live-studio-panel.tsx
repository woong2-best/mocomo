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
  broadcastRoleLabelKo,
  type EffectiveBroadcastRole,
} from "@/lib/live-broadcast/permissions";
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

export function LiveStudioPanel({ initial }: { initial: StudioInitial }) {
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
      setSettingsMsg("저장되었습니다. 달력 상단 요일이 연두색으로 표시됩니다.");
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
    setActionMsg("시청자를 차단했습니다.");
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
    setActionMsg("관리자로 지정했습니다.");
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
            <p className="folk-tag mb-1.5 w-fit">라이브</p>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-folk-cobalt folk-chunky-text">
              라이브 스튜디오
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              채팅 공지·카테고리·스태프·차단을 한곳에서 관리합니다. 제목·설명은 YouTube/Twitch에서
              바꾸면 자동 반영됩니다.
            </p>
            <Link
              href="/live"
              className="mt-2 inline-flex text-xs font-semibold text-muted-foreground hover:text-folk-cobalt transition-colors"
            >
              ← 라이브로 돌아가기
            </Link>
          </div>
          {(firstPartyOn || externalOn) && (
            <Button asChild className="rounded-xl gap-2 shrink-0">
              <Link href={goLiveHref}>
                <Video className="h-4 w-4" />
                방송 시작
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
            <h2 className="font-display font-bold text-folk-cobalt">방송 기본 설정</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            기본 카테고리와 채팅 공지입니다. 방송 제목·설명은 YouTube/Twitch 설정을 그대로
            씁니다.
          </p>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">카테고리</label>
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
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Pin className="h-3.5 w-3.5" />
              채팅 상단 고정 메시지
            </label>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="시청자 채팅 위에 항상 보이는 공지 · 링크·#태그 가능"
              className="rounded-xl mt-1 w-full min-h-[80px] border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">채널 소개</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={2}
              className="rounded-xl mt-1 w-full min-h-[64px] border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">매주 방송 요일</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { d: 1, label: "월" },
                { d: 2, label: "화" },
                { d: 3, label: "수" },
                { d: 4, label: "목" },
                { d: 5, label: "금" },
                { d: 6, label: "토" },
                { d: 0, label: "일" },
              ].map((w) => (
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
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">방송 시각 (시:분)</label>
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
            <label className="text-xs text-muted-foreground">방송 메모 (요일 헤더 클릭 시)</label>
            <textarea
              value={scheduleNote}
              onChange={(e) => setScheduleNote(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder={"예: 잡담 · 게임 같이 하기\n줄바꿈도 가능합니다"}
              className="rounded-xl mt-1 w-full min-h-[88px] border border-input bg-background px-3 py-2 text-sm whitespace-pre-wrap"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              선택한 요일만 달력 상단(월~일)에 연두색으로 표시됩니다. 날짜별 메모는 달력에서
              각각 따로 작성합니다.
            </p>
          </div>

          <Button
            className="w-full sm:w-auto rounded-xl"
            onClick={saveSettings}
            disabled={settingsPending}
          >
            {settingsPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            설정 저장
          </Button>
          {settingsMsg ? (
            <p className="text-xs text-muted-foreground">{settingsMsg}</p>
          ) : null}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="folk-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-folk-cobalt" />
              <h2 className="font-display font-bold text-folk-cobalt">관리자</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              MoCoMo 유저만 관리자로 지정 · 모든 방송에 적용됩니다
            </p>

            <div className="flex gap-2">
              <Input
                value={staffQuery}
                onChange={(e) => setStaffQuery(e.target.value)}
                placeholder="@username 검색"
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
                        {broadcastRoleLabelKo(h.currentRole)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-lg"
                      disabled={busy || h.currentRole === "OWNER"}
                      onClick={() => void assignStaff(h.id)}
                    >
                      지정
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
                        aria-label="역할 제거"
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
              <h2 className="font-display font-bold text-folk-cobalt">시청자 차단</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              MoCoMo 유저만 차단 · 이후 방송에서도 채팅이 막힙니다
            </p>

            <div className="flex gap-2">
              <Input
                value={banQuery}
                onChange={(e) => setBanQuery(e.target.value)}
                placeholder="@username 검색 후 차단"
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
                        {h.isBanned ? "이미 차단됨" : broadcastRoleLabelKo(h.currentRole)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-lg"
                      disabled={busy || h.currentRole === "OWNER" || h.isBanned}
                      onClick={() => void banUser(h.id)}
                    >
                      차단
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
                차단된 시청자가 없습니다
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
                      해제
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
