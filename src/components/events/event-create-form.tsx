"use client";
import { createTranslator } from "@/lib/i18n/messages";
const i18n = createTranslator("en");



import { errorText } from "@/lib/i18n/error-text";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { registerEventSponsoredAd } from "@/actions/sponsored-ad";
import { EVENT_REGISTRATION_MAX_DAYS } from "@/lib/event-registration";
import { isGalleryImageFile } from "@/lib/gallery-image-upload";
import {
  SPONSORED_AD_ASPECT,
  SPONSORED_AD_IMAGE_MAX_HEIGHT,
  SPONSORED_AD_IMAGE_MAX_WIDTH,
  SPONSORED_AD_MAX_DAYS,
  SPONSORED_AD_MOCO_PER_DAY,
} from "@/lib/sponsored-ad/constants";
import {
  defaultSponsoredAdStartTime,
  sponsoredAdScheduleSummary,
  toLocalDateTimeInputValue,
  validateSponsoredAdSchedule,
} from "@/lib/sponsored-ad/schedule";
import { EventAdEditPanel } from "@/components/events/event-ad-edit-panel";
import { SponsorAdPreviewFrame } from "@/components/events/sponsor-ad-preview-frame";
import { SponsoredAdSchedulePicker } from "@/components/events/sponsored-ad-schedule-picker";
import { PaymentLegalConsentModal } from "@/components/legal/payment-legal-consent-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageCropDialog } from "@/components/media/image-crop-dialog";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40";

export function EventCreateForm({
  purchasedMoco = 0,
  isOperator = false,
  paidEventId,
  paidLinkUrl,
  paidImageUrl,
}: {
  purchasedMoco?: number;
  isOperator?: boolean;
  paidEventId?: string | null;
  paidLinkUrl?: string | null;
  paidImageUrl?: string | null;
}) {
  const [startTime, setStartTime] = useState(() => defaultSponsoredAdStartTime());
  const [durationDays, setDurationDays] = useState(1);
  const [linkUrl, setLinkUrl] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registeredEventId, setRegisteredEventId] = useState<string | null>(paidEventId ?? null);
  const [successLinkUrl, setSuccessLinkUrl] = useState(paidLinkUrl ?? "");
  const [successImageUrl, setSuccessImageUrl] = useState(paidImageUrl ?? "");
  const [error, setError] = useState("");

  const schedule = useMemo(
    () => sponsoredAdScheduleSummary(startTime, durationDays, { unlimited: isOperator }),
    [startTime, durationDays, isOperator]
  );
  const mocoCost = schedule.moco;

  const maxScheduleDays = Math.min(EVENT_REGISTRATION_MAX_DAYS, SPONSORED_AD_MAX_DAYS);
  const durationTooLong = !isOperator && durationDays > maxScheduleDays;
  const startInPast =
    !isOperator &&
    validateSponsoredAdSchedule(startTime, durationDays, new Date(), {
      maxDays: maxScheduleDays,
    }) != null;
  const insufficientMoco = !isOperator && purchasedMoco < mocoCost;

  async function onMainImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isGalleryImageFile(file, true)) {
      setError(i18n("events.s13qm3zj"));
      return;
    }
    setError("");
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    setCropOpen(true);
  }

  function closeCropDialog(open: boolean) {
    setCropOpen(open);
    if (!open && cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!mainImageUrl.trim()) {
      setError(i18n("events.s15062kd"));
      return;
    }
    if (!linkUrl.trim()) {
      setError(i18n("events.sxfb8bl"));
      return;
    }
    if (!isOperator) {
      const scheduleError = validateSponsoredAdSchedule(startTime, durationDays, new Date(), {
        maxDays: maxScheduleDays,
      });
      if (scheduleError) {
        setError(scheduleError);
        return;
      }
      if (durationTooLong) {
        setError(`Ad schedule can be at most ${maxScheduleDays} days.`);
        return;
      }
      if (insufficientMoco) {
        setError(i18n("events.moco_2"));
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await registerEventSponsoredAd({
        imageUrl: mainImageUrl,
        linkUrl,
        startsAt: toLocalDateTimeInputValue(startTime),
        days: durationDays,
        operatorUnlimited: isOperator,
      });
      if (!res.ok) {
        setError(errorText(res.error));
        return;
      }
      setRegisteredEventId(res.eventId);
      setSuccessLinkUrl(linkUrl);
      setSuccessImageUrl(mainImageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n("events.s199o885"));
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredEventId) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{i18n("events.scsj9tc")}</p>
          <p className="text-sm text-muted-foreground">
            {isOperator
              ? i18n("events.s18fk2ov")
              : i18n("events.moco_3")}
          </p>
        </div>
        {successImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={successImageUrl}
            alt=""
            className="mx-auto w-40 rounded-2xl object-cover border border-border aspect-[4/5]"
          />
        ) : null}
        <EventAdEditPanel
          eventId={registeredEventId}
          initialImageUrl={successImageUrl || mainImageUrl}
          initialLinkUrl={successLinkUrl || linkUrl}
        />
        <Link href="/">
          <Button className="w-full rounded-xl bg-[#A855F7] hover:bg-[#C084FC]">
            Back to home
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <p className="text-sm text-muted-foreground">
          {isOperator ? (
            <>
              <strong className="text-foreground">{i18n("events.sn8f9gu")}</strong> — no MOCO charge;{" "}
              <strong className="text-foreground">stays visible until you delete it</strong>.
            </>
          ) : (
            <>
              Register image, link, and schedule only.{" "}
              <strong className="text-foreground">{SPONSORED_AD_MOCO_PER_DAY} MOCO</strong> per 24h ·
              charged once at registration
            </>
          )}
        </p>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{i18n("events.s1onguiz")}</label>
          <div className="flex flex-wrap gap-2">
            {mainImageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainImageUrl}
                  alt=""
                  className="w-36 rounded-xl object-cover border border-border aspect-[4/5]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-background border border-border"
                  onClick={() => setMainImageUrl("")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <label className="flex w-36 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border aspect-[4/5] hover:border-[#A855F7]/40 hover:bg-[#A855F7]/5 transition-colors">
                <span className="text-sm text-muted-foreground">{i18n("events.s1lohsbl")}</span>
                <input type="file" accept="image/*" className="hidden" onChange={onMainImagePick} />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Link on click</label>
          <Input
            placeholder="https://"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className={fieldClass}
            type="url"
            required
          />
        </div>

        <SponsoredAdSchedulePicker
          startTime={startTime}
          days={durationDays}
          isOperator={isOperator}
          onChange={(nextStart, nextDays) => {
            setStartTime(nextStart);
            setDurationDays(nextDays);
          }}
        />

        {durationTooLong ? (
          <p className="text-xs text-destructive">
            Schedule can be at most {EVENT_REGISTRATION_MAX_DAYS} days.
          </p>
        ) : startInPast ? (
          <p className="text-xs text-destructive">{i18n("lib.sponsored-ad.s1digvn3")}</p>
        ) : insufficientMoco ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {durationDays} days ({mocoCost} MOCO) requires {purchasedMoco.toLocaleString()} MOCO balance —
            top up to register
          </p>
        ) : isOperator ? (
          <p className="text-xs text-muted-foreground">
            Operator registration · no duration cap · no MOCO charge
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {durationDays} days (24h × {durationDays}) · {mocoCost} MOCO upfront · balance{" "}
            {purchasedMoco.toLocaleString()} MOCO
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {cropSrc && (
          <ImageCropDialog
            open={cropOpen}
            onOpenChange={closeCropDialog}
            imageSrc={cropSrc}
            aspect={SPONSORED_AD_ASPECT}
            lockAspect
            objectFit="contain"
            showSponsorPreview
            title={i18n("events.s1onguiz")}
            description={i18n("events.4_5")}
            maxWidth={SPONSORED_AD_IMAGE_MAX_WIDTH}
            maxHeight={SPONSORED_AD_IMAGE_MAX_HEIGHT}
            uploadFilename="event-ad.jpg"
            onComplete={(url) => {
              setMainImageUrl(url);
              closeCropDialog(false);
            }}
          />
        )}

        <Button
          type="submit"
          className="w-full rounded-xl bg-[#A855F7] hover:bg-[#C084FC]"
          disabled={
            submitting || durationTooLong || startInPast || !mainImageUrl.trim() || !linkUrl.trim()
          }
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registering…
            </>
          ) : (
            isOperator ? i18n("events.sx7ldxn") : `Register ad for ${mocoCost} MOCO`
          )}
        </Button>
        <PaymentLegalConsentModal className="mt-3 px-1" />
      </form>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Sponsored preview
          </p>
          <SponsorAdPreviewFrame
            imageUrl={mainImageUrl || null}
            ctaLabel={linkUrl.trim() ? i18n("events.sqhi9b4") : undefined}
            className={cn(mainImageUrl && "ring-1 ring-[#A855F7]/20")}
          />
          {linkUrl.trim() && (
            <p className="text-[11px] text-muted-foreground break-all">→ {linkUrl.trim()}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
