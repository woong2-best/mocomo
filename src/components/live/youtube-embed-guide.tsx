"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Image from "next/image";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

const GUIDE_IMAGES = {
  error: "/live/guides/youtube-embed/error-embed-blocked.png",
  studioEdit: "/live/guides/youtube-embed/studio-edit.png",
  unchecked: "/live/guides/youtube-embed/settings-unchecked.png",
  checked: "/live/guides/youtube-embed/settings-checked.png",
} as const;

type Props = {
  /** compact = go-live form sidebar, full = standalone card, player = dark in-player fallback */
  variant?: "compact" | "full" | "player";
  watchUrl?: string;
};

export function YoutubeEmbedGuide({ variant = "full", watchUrl }: Props) {
  const { t } = useLocale();

  if (variant === "compact") {
    return (
      <div className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2.5 text-[11px] leading-relaxed text-red-900 dark:text-red-100">
        <p className="font-semibold">{t("live.youtube.guide.compactTitle")}</p>
        <p className="mt-1 text-muted-foreground">{t("live.youtube.guide.compactIntro")}</p>
        <details className="mt-2">
          <summary className="cursor-pointer font-medium text-primary hover:underline">
            {t("live.youtube.guide.showSteps")}
          </summary>
          <GuideSteps className="mt-3" imageClassName="rounded-md border" />
        </details>
      </div>
    );
  }

  if (variant === "player") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-y-auto bg-gradient-to-b from-[#1a0a2e] via-black to-black px-4 py-6 text-white">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h2 className="text-base font-semibold">{t("live.youtube.guide.playerTitle")}</h2>
              <p className="mt-1 text-sm text-white/70">{t("live.youtube.guide.playerIntro")}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10">
            <Image
              src={GUIDE_IMAGES.error}
              alt={t("live.youtube.guide.errorScreenAlt")}
              width={640}
              height={360}
              className="w-full opacity-90"
            />
          </div>

          <GuideSteps
            className="text-sm"
            imageClassName="rounded-lg border border-white/10 shadow-lg"
          />

          {watchUrl ? (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 self-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
            >
              <ExternalLink className="h-4 w-4" />
              {t("live.youtube.guide.watchOnYoutube")}
            </a>
          ) : null}

          <p className="text-center text-xs text-white/50">{t("live.youtube.guide.refreshHint")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-base font-semibold">{t("live.youtube.guide.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("live.youtube.guide.intro")}</p>
      <GuideSteps className="mt-4" imageClassName="rounded-lg border" />
    </div>
  );
}

function GuideSteps({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  const { t } = useLocale();
  const steps = [
    {
      title: t("live.youtube.guide.step1Title"),
      body: t("live.youtube.guide.step1Body"),
      image: GUIDE_IMAGES.studioEdit,
      alt: t("live.youtube.guide.step1Alt"),
    },
    {
      title: t("live.youtube.guide.step2Title"),
      body: t("live.youtube.guide.step2Body"),
      image: GUIDE_IMAGES.unchecked,
      alt: t("live.youtube.guide.step2Alt"),
    },
    {
      title: t("live.youtube.guide.step3Title"),
      body: t("live.youtube.guide.step3Body"),
      image: GUIDE_IMAGES.checked,
      alt: t("live.youtube.guide.step3Alt"),
    },
  ];

  return (
    <ol className={`space-y-4 ${className ?? ""}`}>
      {steps.map((step, i) => (
        <li key={step.title} className="space-y-2">
          <div>
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <span className="font-medium">{step.title}</span>
          </div>
          <p className="text-muted-foreground pl-7 text-xs leading-relaxed">{step.body}</p>
          <div className="pl-7">
            <Image
              src={step.image}
              alt={step.alt}
              width={640}
              height={360}
              className={`w-full ${imageClassName ?? ""}`}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
