"use client";

import type { ReactNode } from "react";
import { Radio } from "lucide-react";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { LiveRoomErrorState } from "@/components/live/live-room-error-state";
import { useLocale } from "@/components/providers/locale-provider";

export function LiveFeatureDisabledNotice({
  title,
  description,
}: {
  title?: string;
  description?: ReactNode;
} = {}) {
  const { t } = useLocale();
  return (
    <LiveRoomErrorState
      title={title ?? t("live.featureDisabled.title")}
      description={
        description ?? (
          <>
            {t("live.featureDisabled.body1")}
            <br />
            {t("live.featureDisabled.body2")}
            <br />
            {t("live.featureDisabled.body3")}
          </>
        )
      }
      icon={Radio}
      variant="muted"
      primaryHref={DEFAULT_LANDING_PATH}
      primaryLabel={t("live.featureDisabled.home")}
      secondaryHref="/live/external/new"
      secondaryLabel={t("live.startBroadcast")}
    />
  );
}
