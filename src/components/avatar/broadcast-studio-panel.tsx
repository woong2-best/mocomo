"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import {
  ExternalLink,
  MessageSquare,
  Monitor,
  Radio,
  Settings2,
  Shield,
  Video,
} from "lucide-react";
import { FolkBrushDivider } from "@/components/brand/folk-decor";
import { StudioBackLink } from "@/components/avatar/studio-back-link";
import { StreamerSettingsForm } from "@/components/live/streamer-settings-form";
import { LiveObsStandardGuide } from "@/components/live/live-obs-standard-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isFirstPartyLiveEnabled } from "@/lib/live-feature";

type QuickLink = {
  href: string;
  icon: typeof Video;
  title: string;
  description: string;
  external?: boolean;
};

function buildQuickLinks(firstPartyOn: boolean): QuickLink[] {
  return [
    {
      href: firstPartyOn ? "/voice/new" : "/live/external/new",
      icon: Video,
      title: t("avatar.s1hesk5s"),
      description: firstPartyOn
        ? t("avatar.ssqlpnc")
        : t("avatar.mocomo"),
    },
    {
      href: "/avatar/broadcast",
      icon: Monitor,
      title: t("avatar.obs_5"),
      description: t("avatar.vtuber_url"),
      external: true,
    },
    {
      href: "/live",
      icon: Radio,
      title: t("avatar.sx1ht4s"),
      description: t("avatar.s79xaq5"),
    },
    {
      href: "/settings/streamer",
      icon: Settings2,
      title: t("avatar.syrc8oh"),
      description: t("avatar.stgtlsz"),
    },
  ];
}

export function BroadcastStudioPanel({
  initial,
}: {
  initial: { bio: string; announcement: string; scheduleNote: string };
}) {
  const firstPartyOn = isFirstPartyLiveEnabled();
  const goLiveHref = firstPartyOn ? "/voice/new" : "/live/external/new";
  const quickLinks = buildQuickLinks(firstPartyOn);

  return (
    <div className="live-page-shell w-full max-w-none space-y-4 sm:space-y-5 pb-nav lg:pb-6 min-h-[calc(100dvh-var(--header-h))]">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5">
        <StudioBackLink />

        <header className="live-hero flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-folk-terracotta/30 bg-folk-terracotta/15 text-folk-terracotta shrink-0">
            <Radio className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="folk-tag mb-1.5 w-fit">{t("avatar.sx2fs")}</p>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-folk-cobalt folk-chunky-text">
              {t("avatar.sn9kols")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("avatar.obs_3")}
            </p>
          </div>
          <Button asChild className="rounded-xl gap-2 shrink-0">
            <Link href={goLiveHref}>
              <Video className="h-4 w-4" />
              {t("avatar.s1dub35p")}
            </Link>
          </Button>
        </header>

        <FolkBrushDivider className="opacity-50" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="folk-card block p-4 hover:border-folk-terracotta/50 transition-colors"
              >
                <Icon className="h-5 w-5 text-folk-terracotta mb-2" />
                <p className="font-semibold text-sm flex items-center gap-1">
                  {item.title}
                  {item.external ? <ExternalLink className="h-3 w-3 text-muted-foreground" /> : null}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{item.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="folk-card border-folk-cobalt/25">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-folk-cobalt" />
                {t("avatar.sc5py3w")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("avatar.s12rprmd")}
              </p>
            </CardHeader>
            <CardContent>
              <StreamerSettingsForm initial={initial} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {firstPartyOn ? (
              <Card className="folk-card border-violet-500/25 bg-violet-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-violet-600" />
                    {t("avatar.obs_rtmp")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <LiveObsStandardGuide />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t("avatar.obs_mocomo_webrtc_2")}
                  </p>
                  <Button asChild variant="outline" size="sm" className="rounded-xl w-full">
                    <Link href="/voice/new">{t("avatar.obs_4")}</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="folk-card border-violet-500/25 bg-violet-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-violet-600" />
                    {t("avatar.sijcooj")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t("avatar.mocomo_url")}
                  </p>
                  <Button asChild variant="outline" size="sm" className="rounded-xl w-full">
                    <Link href="/live/external/new">{t("avatar.sk9lxqg")}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="folk-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Shield className="h-4 w-4 text-folk-cobalt" />
                  {t("avatar.s17z98f7")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                  {t("avatar.s18u2m5q")}
                </p>
                <p>{t("avatar.skiu325")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
