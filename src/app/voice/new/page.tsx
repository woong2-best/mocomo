"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LiveBroadcastMode, LiveStreamCategory, LiveVisibility, SupportTierLevel } from "@prisma/client";
import { SUPPORT_TIERS } from "@/lib/tiers";
import { tierLabelKo } from "@/lib/live-viewer-access";
import { createLiveStream, getLiveHostEligibilityAction, releaseStaleHostLiveSessions } from "@/actions/live-stream";
import { LIVE_HOST_MIN_FOLLOWERS } from "@/lib/creator-follower-badge";
import { CreatorFollowerBadge } from "@/components/user/creator-follower-badge";
import { LIVE_CATEGORIES } from "@/lib/live-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, ChevronLeft, KeyRound, Copy, Check, Calendar, Video, Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  "🎙 애니덕질 라이브",
  "코스프레 촬영 Behind",
  "애니 같이 보기",
  "버튜버 잡담",
];

const VOICE_PRESETS = [
  "🎙 밤샘 잡담",
  "애니 OST 토크",
  "ASMR·목소리 라디오",
  "친구랑 수다",
];

const LIVE_PW_KEY = (id: string) => `mocomo_live_pw_${id}`;
const LIVE_CREATED_UI_KEY = "mocomo_live_created_ui";

type CreatedUiState = {
  channelId: string;
  password?: string;
  scheduled?: boolean;
  broadcastMode: LiveBroadcastMode;
};

function readCreatedUiFromStorage(channelId?: string | null): CreatedUiState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LIVE_CREATED_UI_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CreatedUiState;
    if (!parsed?.channelId) return null;
    if (channelId && parsed.channelId !== channelId) return null;
    if (parsed.scheduled || parsed.password) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function persistCreatedUi(state: CreatedUiState) {
  sessionStorage.setItem(LIVE_CREATED_UI_KEY, JSON.stringify(state));
  if (state.password) {
    sessionStorage.setItem(LIVE_PW_KEY(state.channelId), state.password);
  }
  window.history.replaceState(null, "", `/voice/new?started=${state.channelId}`);
}

function clearCreatedUi(channelId?: string) {
  sessionStorage.removeItem(LIVE_CREATED_UI_KEY);
  if (channelId) sessionStorage.removeItem(LIVE_PW_KEY(channelId));
  window.history.replaceState(null, "", "/voice/new");
}

const BROADCAST_CATEGORIES = LIVE_CATEGORIES.filter((c) => c.value !== "ALL");

export default function NewVoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [name, setName] = useState(PRESETS[0]);
  const [category, setCategory] = useState<LiveStreamCategory>("JUST_CHATTING");
  const [broadcastMode, setBroadcastMode] = useState<LiveBroadcastMode>("BROWSER");
  const [liveVisibility, setLiveVisibility] = useState<LiveVisibility>("PUBLIC");
  const [minViewerTier, setMinViewerTier] = useState<SupportTierLevel>("BRONZE");
  const [created, setCreated] = useState<CreatedUiState | null>(null);
  const [copied, setCopied] = useState(false);
  const [prepNotice, setPrepNotice] = useState("");
  const [blockingChannelId, setBlockingChannelId] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [hostEligible, setHostEligible] = useState<boolean | null>(null);
  const [hostEligibilityMsg, setHostEligibilityMsg] = useState("");
  const [followerCount, setFollowerCount] = useState(0);
  const [creatorBadge, setCreatorBadge] = useState<
    import("@/lib/creator-follower-badge").CreatorFollowerBadgeId | null
  >(null);

  async function runSessionPrepare() {
    const res = await releaseStaleHostLiveSessions();
    if (res.released?.length) {
      setPrepNotice(`이전 방송 ${res.released.length}건을 정리했습니다. 새 방송을 시작할 수 있습니다.`);
    }
    if (!res.ok && res.error) setSubmitError(res.error);
  }

  useEffect(() => {
    void getLiveHostEligibilityAction().then((res) => {
      setHostEligible(res.eligible);
      setHostEligibilityMsg(res.message ?? "");
      setFollowerCount(res.followerCount);
      setCreatorBadge(res.badge);
      if (res.eligible) void runSessionPrepare();
    });
  }, []);

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "voice") {
      setBroadcastMode("VOICE");
      setName(VOICE_PRESETS[0]);
      setCategory("MUSIC");
    }
  }, []);

  useEffect(() => {
    if (created) return;
    const started =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("started")
        : null;
    const restored = readCreatedUiFromStorage(started);
    if (restored) setCreated(restored);
  }, [created]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError("");
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const scheduledRaw = (form.get("scheduledAt") as string)?.trim();
      const maxUsersRaw = parseInt(form.get("maxUsers") as string, 10);
      const defaultMax = broadcastMode === "VOICE" ? 500 : 200;
      const result = await createLiveStream({
        name: (form.get("name") as string) || name,
        maxUsers: Number.isFinite(maxUsersRaw) && maxUsersRaw > 0 ? maxUsersRaw : defaultMax,
        allowScreen: broadcastMode !== "VOICE",
        allowCamera: broadcastMode !== "VOICE",
        category,
        tags: (form.get("tags") as string) || "",
        thumbnailUrl: (form.get("thumbnailUrl") as string) || undefined,
        description: (form.get("description") as string) || undefined,
        scheduledAt: scheduledRaw || undefined,
        donationGoalKrw: parseInt(form.get("donationGoalKrw") as string, 10) || undefined,
        broadcastMode,
        liveVisibility,
        minViewerTier: liveVisibility === "PRIVATE" ? minViewerTier : undefined,
      });

      if (result.error) {
        setSubmitError(result.error);
        setBlockingChannelId(
          "existingChannelId" in result && typeof result.existingChannelId === "string"
            ? result.existingChannelId
            : null
        );
        return;
      }
      setBlockingChannelId(null);

      if (!result.channel) {
        setSubmitError("방송 방을 만들지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      if (result.scheduled) {
        const scheduledState: CreatedUiState = {
          channelId: result.channel.id,
          scheduled: true,
          broadcastMode,
        };
        persistCreatedUi(scheduledState);
        setCreated(scheduledState);
        return;
      }

      if (!result.joinPassword) {
        setSubmitError("합방 비밀번호를 만들지 못했습니다. 예약 시간이 미래인지 확인해 주세요.");
        return;
      }

      const liveState: CreatedUiState = {
        channelId: result.channel.id,
        password: result.joinPassword,
        broadcastMode,
      };
      persistCreatedUi(liveState);
      if (result.joinPassword) {
        sessionStorage.setItem(LIVE_PW_KEY(result.channel.id), result.joinPassword);
      }
      router.push(`/voice/${result.channel.id}`);
      return;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "방송 시작에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function copyPassword() {
    if (!created?.password) return;
    void navigator.clipboard.writeText(created.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function goToStudio() {
    if (!created) return;
    const id = created.channelId;
    clearCreatedUi(id);
    router.push(`/voice/${id}`);
  }

  function dismissCreated() {
    if (!created) return;
    clearCreatedUi(created.channelId);
    setCreated(null);
  }

  if (created?.scheduled) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-6 pb-24">
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6 text-center space-y-4">
          <Calendar className="h-10 w-10 mx-auto text-sky-600" />
          <h2 className="text-xl font-bold">방송 예약 완료</h2>
          <p className="text-sm text-muted-foreground">
            예약 시간에 스튜디오에서 방송을 시작할 수 있습니다.
          </p>
          <Button className="rounded-xl" variant="outline" asChild>
            <Link href="/live">라이브 홈</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (created?.password) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-6 pb-24">
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center space-y-4">
          <KeyRound className="h-10 w-10 mx-auto text-green-600" />
          <h2 className="text-xl font-bold">방송 준비 완료</h2>
          <p className="text-sm text-muted-foreground">
            스튜디오에서 <strong>방송 시작</strong>을 누르고{" "}
            {created.broadcastMode === "VOICE" ? "마이크" : "카메라·마이크"}를 허용하면 라이브 목록에 노출됩니다.
            {created.broadcastMode === "BROWSER" ? " (OBS·다중 송출 불필요)" : ""}
          </p>
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">합방 비밀번호 (공동 방송용)</p>
            <p className="text-3xl font-mono font-bold tracking-[0.35em] text-foreground">{created.password}</p>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" className="rounded-xl gap-2" onClick={copyPassword}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "복사됨" : "비밀번호 복사"}
            </Button>
            <Button className="rounded-xl gap-2" onClick={goToStudio}>
              <Radio className="h-4 w-4" />
              스튜디오 입장
            </Button>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground underline underline-offset-2"
            onClick={dismissCreated}
          >
            설정 화면으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-24 lg:pb-4">
      <Link href="/live">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          라이브
        </Button>
      </Link>

      <div className="live-hero !p-5">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-folk-terracotta text-white">
            <Radio className="h-5 w-5" />
          </span>
          라이브 방송 만들기
        </h1>
      </div>

      {hostEligible === false && (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6 space-y-3">
            <p className="font-semibold text-amber-900 dark:text-amber-100">라이브 방송 자격 필요</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {hostEligibilityMsg ||
                `팔로워 ${LIVE_HOST_MIN_FOLLOWERS.toLocaleString()}명 이상이면 실버 크리에이터 뱃지가 부여되며 라이브 방송을 시작할 수 있습니다.`}
            </p>
            <p className="text-sm">
              현재 팔로워{" "}
              <strong className="text-foreground">{followerCount.toLocaleString()}명</strong>
              {creatorBadge ? (
                <>
                  {" · "}
                  <CreatorFollowerBadge badge={creatorBadge} size="md" />
                </>
              ) : null}
            </p>
          </CardContent>
        </Card>
      )}

      {hostEligible !== false && (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">방송 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {prepNotice && !submitError && (
              <p className="text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                {prepNotice}
              </p>
            )}
            {submitError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 space-y-2">
                <p>{submitError}</p>
                <div className="flex flex-wrap gap-2">
                  {blockingChannelId && (
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" asChild>
                      <Link href={`/voice/${blockingChannelId}`}>스튜디오로 이동</Link>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-lg"
                    disabled={releasing}
                    onClick={async () => {
                      setReleasing(true);
                      setSubmitError("");
                      await fetch("/api/live/session", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "release-all" }),
                      });
                      await runSessionPrepare();
                      setReleasing(false);
                      setPrepNotice("방송 슬롯을 강제 정리했습니다. 다시 「방송 시작」을 눌러 주세요.");
                    }}
                  >
                    {releasing ? "정리 중…" : "방송 슬롯 강제 정리"}
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">방송 유형</p>
              <div className="flex gap-2 p-1 rounded-xl bg-muted/40 border">
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-xs py-2.5 rounded-lg font-medium flex items-center justify-center gap-1.5",
                    broadcastMode === "BROWSER" ? "bg-background shadow" : "text-muted-foreground"
                  )}
                  onClick={() => {
                    setBroadcastMode("BROWSER");
                    setName(PRESETS[0]);
                  }}
                >
                  <Video className="h-3.5 w-3.5" />
                  영상 라이브
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-xs py-2.5 rounded-lg font-medium flex items-center justify-center gap-1.5",
                    broadcastMode === "VOICE" ? "bg-background shadow" : "text-muted-foreground"
                  )}
                  onClick={() => {
                    setBroadcastMode("VOICE");
                    setName(VOICE_PRESETS[0]);
                    setCategory("MUSIC");
                  }}
                >
                  <Mic2 className="h-3.5 w-3.5" />
                  보이스 라이브
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(broadcastMode === "VOICE" ? VOICE_PRESETS : PRESETS).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setName(p)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    name === p ? "bg-primary text-primary-foreground border-primary" : "border-border"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="방송 제목"
              required
            />
            {broadcastMode === "VOICE" ? (
              <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2.5 text-xs text-muted-foreground">
                <Mic2 className="h-4 w-4 shrink-0 text-violet-600" />
                <span>
                  <strong className="text-foreground">목소리만</strong> 송출합니다 (스푼형). LiveKit 오디오 SFU로
                  시청자가 몰려도 영상 CDN 부담 없이 안정적입니다.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                <Video className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  브라우저에서 <strong className="text-foreground">웹캠·화면 공유</strong>로 Cloudflare CDN에 바로
                  송출합니다.
                </span>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">시청 공개 범위</p>
              <div className="flex gap-2 p-1 rounded-xl bg-muted/40 border">
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-xs py-2 rounded-lg font-medium",
                    liveVisibility === "PUBLIC" ? "bg-background shadow" : "text-muted-foreground"
                  )}
                  onClick={() => setLiveVisibility("PUBLIC")}
                >
                  공개 (누구나 시청)
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-xs py-2 rounded-lg font-medium",
                    liveVisibility === "PRIVATE" ? "bg-background shadow" : "text-muted-foreground"
                  )}
                  onClick={() => setLiveVisibility("PRIVATE")}
                >
                  비공개 (등급 제한)
                </button>
              </div>
              {liveVisibility === "PRIVATE" && (
                <select
                  className="w-full h-10 rounded-xl border bg-background px-3 text-sm"
                  value={minViewerTier}
                  onChange={(e) => setMinViewerTier(e.target.value as SupportTierLevel)}
                >
                  {SUPPORT_TIERS.filter((t) => t.minAmount >= 10_000).map((t) => (
                    <option key={t.level} value={t.level}>
                      {tierLabelKo(t.level)} 이상 후원자
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {BROADCAST_CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value as LiveStreamCategory)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    category === value ? "bg-folk-terracotta text-white border-folk-terracotta" : "border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Input name="tags" placeholder="태그 (선택)" />
            <Input name="thumbnailUrl" placeholder="썸네일 URL (선택)" />
            <Input name="description" placeholder="방송 설명 (선택)" />
            <Input name="donationGoalKrw" type="number" placeholder="후원 목표 원 (선택)" min={1000} step={1000} />
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-foreground">최대 시청자</span>
              <Input
                name="maxUsers"
                type="number"
                min={1}
                max={broadcastMode === "VOICE" ? 2000 : 500}
                defaultValue={broadcastMode === "VOICE" ? 500 : 200}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                {broadcastMode === "VOICE"
                  ? "보이스 라이브는 오디오만 전송해 동시 시청자를 더 많이 받을 수 있습니다 (최대 2,000명)"
                  : "이 방에 동시에 들어올 수 있는 시청자 수 (기본 200명)"}
              </p>
            </label>
            <details className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">
                나중에 시작 — 예약 방송 (선택)
              </summary>
              <div className="mt-2 space-y-1.5">
                <span className="text-[10px] text-muted-foreground">시작 날짜·시간</span>
                <Input name="scheduledAt" type="datetime-local" className="rounded-xl" />
                <p>비우면 지금 바로 방송 준비. 시간을 넣으면 /live 에 예약 목록으로만 올라갑니다.</p>
              </div>
            </details>
            <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading}>
              {broadcastMode === "VOICE" ? <Mic2 className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
              {loading ? "만드는 중…" : broadcastMode === "VOICE" ? "보이스 방송 시작" : "방송 시작"}
            </Button>
          </form>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
