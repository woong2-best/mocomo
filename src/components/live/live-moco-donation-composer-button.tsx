"use client";

import { useState } from "react";
import { ChevronRight, Film, Music } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MocoTipButton } from "@/components/live/moco-tip-button";
import { MocoDonationDialog } from "@/components/live/moco-donation-dialog";
import { MocoVideoDonationDialog } from "@/components/live/moco-video-donation-dialog";
import { cn } from "@/lib/utils";

type Props = {
  channelId: string;
  hostDisplayName?: string;
  mocoBalance?: number;
  userImageUrl?: string | null;
  onDonateSuccess?: (remaining: number) => void;
  buttonSize?: number;
  className?: string;
};

/** Chat composer — $ opens menu above; picks video or SFX (chat) MOCO tip. */
export function LiveMocoDonationComposerButton({
  channelId,
  hostDisplayName,
  mocoBalance,
  userImageUrl,
  onDonateSuccess,
  buttonSize = 36,
  className,
}: Props) {
  const { t } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [sfxOpen, setSfxOpen] = useState(false);

  const pickVideo = () => {
    setMenuOpen(false);
    setVideoOpen(true);
  };

  const pickSfx = () => {
    setMenuOpen(false);
    setSfxOpen(true);
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <MocoTipButton
            className={className}
            size={buttonSize}
            aria-label={t("live.donation.menu.title")}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-[min(calc(100vw-1.5rem),20rem)] rounded-xl border border-border bg-background p-0 shadow-xl"
        >
          <div className="border-b border-border/60 px-3 py-2.5">
            <p className="text-sm font-extrabold text-foreground">{t("live.donation.menu.title")}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
              {hostDisplayName ? `${hostDisplayName} · ` : ""}
              {t("live.donation.menu.subtitle")}
            </p>
          </div>
          <button
            type="button"
            className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors hover:bg-muted/60"
            onClick={pickVideo}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0d4d2c]/10">
              <Film className="h-5 w-5 text-[#0d4d2c]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-foreground">{t("live.sh6wx58")}</span>
              <span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">
                {t("live.donation.menu.videoHint")}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60"
            )}
            onClick={pickSfx}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E85D04]/10">
              <Music className="h-5 w-5 text-[#E85D04]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-foreground">{t("live.sc8rtpw")}</span>
              <span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">
                {t("live.donation.menu.sfxHint")}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuContent>
      </DropdownMenu>

      <MocoVideoDonationDialog
        streamerId={channelId}
        mocoBalance={mocoBalance}
        userImageUrl={userImageUrl}
        onSuccess={onDonateSuccess}
        open={videoOpen}
        onOpenChange={setVideoOpen}
      />
      <MocoDonationDialog
        streamerId={channelId}
        mocoBalance={mocoBalance}
        userImageUrl={userImageUrl}
        onSuccess={onDonateSuccess}
        open={sfxOpen}
        onOpenChange={setSfxOpen}
      />
    </>
  );
}
