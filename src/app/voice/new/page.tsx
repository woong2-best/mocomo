"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LiveBroadcastMode, LiveStreamCategory, LiveVisibility, SupportTierLevel } from "@prisma/client";
import { SUPPORT_TIERS } from "@/lib/tiers";
import { BROADCAST_PICK_CATEGORIES } from "@/lib/live-categories";
import { createLiveStream, releaseStaleHostLiveSessions } from "@/actions/live-stream";
import { getLiveStudioSettings } from "@/actions/live-studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, ChevronLeft, KeyRound, Copy, Check, Calendar, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { useLocale } from "@/components/providers/locale-provider";
import type { MessageKey } from "@/lib/i18n/message-keys";

const PRESET_KEYS = [
  "live.create.preset1",
  "live.create.preset2",
  "live.create.preset3",
  "live.create.preset4",
] as const satisfies readonly MessageKey[];

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

const BROADCAST_CATEGORIES = BROADCAST_PICK_CATEGORIES;

export default function NewVoicePage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const presets = useMemo(() => PRESET_KEYS.map((key) => t(key)), [t]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<LiveStreamCategory>("JUST_CHATTING");
  const [liveVisibility, setLiveVisibility] = useState<LiveVisibility>("PUBLIC");
  const [minViewerTier, setMinViewerTier] = useState<SupportTierLevel>("BRONZE");
  const [isNsfw, setIsNsfw] = useState(false);
  const [created, setCreated] = useState<CreatedUiState | null>(null);
  const [copied, setCopied] = useState(false);
  const [prepNotice, setPrepNotice] = useState("");
  const [blockingChannelId, setBlockingChannelId] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  function tierOptionLabel(level: SupportTierLevel): string {
    const tier = SUPPORT_TIERS.find((row) => row.level === level);
    if (!tier) return level;
    const label = locale === "ko" ? tier.labelKo : tier.label;
    return t("live.create.minTierSupporter", { tier: label });
  }

  async function runSessionPrepare() {
    const res = await releaseStaleHostLiveSessions();
    if (res.released?.length) {
      setPrepNotice(t("live.create.sessionsCleaned", { count: String(res.released.length) }));
    }
    if (!res.ok && res.error) setSubmitError(res.error);
  }

  useEffect(() => {
    void runSessionPrepare();
    void getLiveStudioSettings()
      .then((s) => {
        if (s.defaultTitle?.trim()) setName(s.defaultTitle.trim());
        else setName((prev) => prev || presets[0] || "");
        if (s.defaultCategory && s.defaultCategory !== "VIRTUAL") {
          setCategory(s.defaultCategory);
        }
      })
      .catch(() => {
        setName((prev) => prev || presets[0] || "");
      });
  }, [presets]);

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
      const result = await createLiveStream({
        name: (form.get("name") as string) || name,
        maxUsers: Number.isFinite(maxUsersRaw) && maxUsersRaw > 0 ? maxUsersRaw : 200,
        allowScreen: true,
        allowCamera: true,
        category,
        tags: (form.get("tags") as string) || "",
        thumbnailUrl: (form.get("thumbnailUrl") as string) || undefined,
        description: (form.get("description") as string) || undefined,
        scheduledAt: scheduledRaw || undefined,
        donationGoalKrw: parseInt(form.get("donationGoalKrw") as string, 10) || undefined,
        broadcastMode: "BROWSER",
        liveVisibility,
        minViewerTier: liveVisibility === "PRIVATE" ? minViewerTier : undefined,
        isNsfw,
        contentRating: isNsfw ? "ADULT" : "GENERAL",
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
        setSubmitError(t("live.create.createRoomFailed"));
        return;
      }

      if (result.scheduled) {
        const scheduledState: CreatedUiState = {
          channelId: result.channel.id,
          scheduled: true,
          broadcastMode: "BROWSER",
        };
        persistCreatedUi(scheduledState);
        setCreated(scheduledState);
        return;
      }

      if (!result.joinPassword) {
        setSubmitError(t("live.create.passwordFailed"));
        return;
      }

      const liveState: CreatedUiState = {
        channelId: result.channel.id,
        password: result.joinPassword,
        broadcastMode: "BROWSER",
      };
      persistCreatedUi(liveState);
      if (result.joinPassword) {
        sessionStorage.setItem(LIVE_PW_KEY(result.channel.id), result.joinPassword);
      }
      router.push(`/voice/${result.channel.id}`);
      return;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("live.create.startFailed"));
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
      <AppPageChrome spacing="sm">
      <div className="space-y-6">
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6 text-center space-y-4">
          <Calendar className="h-10 w-10 mx-auto text-sky-600" />
          <h2 className="text-xl font-bold">{t("live.create.scheduledTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("live.create.scheduledDesc")}</p>
          <Button className="rounded-xl" variant="outline" asChild>
            <Link href="/live">{t("live.create.scheduledHome")}</Link>
          </Button>
        </div>
      </div>
      </AppPageChrome>
    );
  }

  if (created?.password) {
    return (
      <AppPageChrome spacing="sm">
      <div className="space-y-6">
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center space-y-4">
          <KeyRound className="h-10 w-10 mx-auto text-green-600" />
          <h2 className="text-xl font-bold">{t("live.create.readyTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("live.create.readyDesc")}</p>
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">{t("live.create.collabPasswordLabel")}</p>
            <p className="text-3xl font-mono font-bold tracking-[0.35em] text-foreground">{created.password}</p>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" className="rounded-xl gap-2" onClick={copyPassword}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("live.create.copied") : t("live.create.copyPassword")}
            </Button>
            <Button className="rounded-xl gap-2" onClick={goToStudio}>
              <Radio className="h-4 w-4" />
              {t("live.create.enterStudio")}
            </Button>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground underline underline-offset-2"
            onClick={dismissCreated}
          >
            {t("live.create.backToSetup")}
          </button>
        </div>
      </div>
      </AppPageChrome>
    );
  }

  return (
    <AppPageChrome spacing="sm">
    <div className="space-y-4">
      <Link href="/live">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          {t("live.navBack")}
        </Button>
      </Link>

      <div className="live-hero !p-5">
        <NativePageTitle>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-folk-terracotta text-white">
              <Radio className="h-5 w-5" />
            </span>
            {t("live.create.pageTitle")}
          </h1>
        </NativePageTitle>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">{t("live.create.settingsTitle")}</CardTitle>
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
                      <Link href={`/voice/${blockingChannelId}`}>{t("live.create.goToStudio")}</Link>
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
                      setPrepNotice(t("live.create.slotsReleased"));
                    }}
                  >
                    {releasing ? t("live.create.releasing") : t("live.create.forceReleaseSlots")}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
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
              placeholder={t("live.create.titlePlaceholder")}
              required
            />
            <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <Video className="h-4 w-4 shrink-0 text-primary" />
              <span>{t("live.create.browserStreamHint")}</span>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("live.create.visibilityLabel")}</p>
              <div className="flex gap-2 p-1 rounded-xl bg-muted/40 border">
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-xs py-2 rounded-lg font-medium",
                    liveVisibility === "PUBLIC" ? "bg-background shadow" : "text-muted-foreground"
                  )}
                  onClick={() => setLiveVisibility("PUBLIC")}
                >
                  {t("live.create.visibilityPublic")}
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 text-xs py-2 rounded-lg font-medium",
                    liveVisibility === "PRIVATE" ? "bg-background shadow" : "text-muted-foreground"
                  )}
                  onClick={() => setLiveVisibility("PRIVATE")}
                >
                  {t("live.create.visibilityPrivate")}
                </button>
              </div>
              {liveVisibility === "PRIVATE" && (
                <select
                  className="w-full h-10 rounded-xl border bg-background px-3 text-sm"
                  value={minViewerTier}
                  onChange={(e) => setMinViewerTier(e.target.value as SupportTierLevel)}
                >
                  {SUPPORT_TIERS.filter((row) => row.minAmount >= 50).map((row) => (
                    <option key={row.level} value={row.level}>
                      {tierOptionLabel(row.level)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="rounded-xl border border-red-500/35 bg-red-500/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-red-900 dark:text-red-100">{t("live.create.adultTitle")}</p>
              <label className="text-xs flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={isNsfw}
                  onChange={(e) => setIsNsfw(e.target.checked)}
                />
                <span>
                  {t("live.create.adultCheckbox")}
                  <span className="block text-[10px] text-muted-foreground mt-1 leading-snug">
                    {t("live.create.adultHint")}
                  </span>
                </span>
              </label>
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
            <Input name="tags" placeholder={t("live.create.tagsPlaceholder")} />
            <Input name="thumbnailUrl" placeholder={t("live.create.thumbnailPlaceholder")} />
            <Input name="description" placeholder={t("live.create.descriptionPlaceholder")} />
            <Input name="donationGoalKrw" type="number" placeholder={t("live.create.donationGoalPlaceholder")} min={1000} step={1000} />
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-foreground">{t("live.create.maxViewersLabel")}</span>
              <Input
                name="maxUsers"
                type="number"
                min={1}
                max={500}
                defaultValue={200}
                className="rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">{t("live.create.maxViewersHint")}</p>
            </label>
            <details className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">
                {t("live.create.scheduleSummary")}
              </summary>
              <div className="mt-2 space-y-1.5">
                <span className="text-[10px] text-muted-foreground">{t("live.create.scheduleDatetimeLabel")}</span>
                <Input name="scheduledAt" type="datetime-local" className="rounded-xl" />
                <p>{t("live.create.scheduleHint")}</p>
              </div>
            </details>
            <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading}>
              <Radio className="h-4 w-4" />
              {loading ? t("live.create.submitLoading") : t("live.create.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
    </AppPageChrome>
  );
}
