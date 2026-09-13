"use client";

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
  SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS,
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
import { PaymentLegalNotice } from "@/components/legal/legal-entity-notice";
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
  const [operatorUnlimited, setOperatorUnlimited] = useState(false);

  const schedule = useMemo(
    () => sponsoredAdScheduleSummary(startTime, durationDays),
    [startTime, durationDays]
  );
  const mocoCost = schedule.moco;

  const maxScheduleDays = operatorUnlimited
    ? SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS
    : Math.min(EVENT_REGISTRATION_MAX_DAYS, SPONSORED_AD_MAX_DAYS);
  const durationTooLong = durationDays > maxScheduleDays;
  const startInPast =
    validateSponsoredAdSchedule(startTime, durationDays, new Date(), {
      skipPastCheck: isOperator && operatorUnlimited,
      maxDays: maxScheduleDays,
    }) != null;
  const insufficientMoco = !isOperator && purchasedMoco < mocoCost;

  async function onMainImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isGalleryImageFile(file, true)) {
      setError("이미지 파일을 선택해 주세요.");
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
      setError("광고 이미지를 등록해 주세요.");
      return;
    }
    if (!linkUrl.trim()) {
      setError("클릭 시 이동할 링크를 입력해 주세요.");
      return;
    }
    const scheduleError = validateSponsoredAdSchedule(startTime, durationDays, new Date(), {
      skipPastCheck: isOperator && operatorUnlimited,
      maxDays: maxScheduleDays,
    });
    if (scheduleError) {
      setError(scheduleError);
      return;
    }
    if (durationTooLong) {
      setError(`광고 기간은 최대 ${maxScheduleDays}일까지 가능합니다.`);
      return;
    }
    if (insufficientMoco) {
      setError("MOCO를 충전해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerEventSponsoredAd({
        imageUrl: mainImageUrl,
        linkUrl,
        startsAt: toLocalDateTimeInputValue(startTime),
        days: durationDays,
        operatorUnlimited: isOperator && operatorUnlimited,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRegisteredEventId(res.eventId);
      setSuccessLinkUrl(linkUrl);
      setSuccessImageUrl(mainImageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredEventId) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <div className="space-y-1">
          <p className="font-semibold text-foreground">광고 등록이 완료되었습니다</p>
          <p className="text-sm text-muted-foreground">
            MOCO가 차감되었고, 피드·이벤트 목록에 노출됩니다. 광고를 클릭하면 설정한 링크로 이동합니다.
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
        <Link href="/events">
          <Button className="w-full rounded-xl bg-[#A855F7] hover:bg-[#C084FC]">
            이벤트 목록으로
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
              <strong className="text-foreground">운영자 계정</strong> — MOCO 차감 없이 광고를
              등록할 수 있습니다.
            </>
          ) : (
            <>
              이미지·링크·노출 기간만 등록합니다. 24시간(1일)당{" "}
              <strong className="text-foreground">{SPONSORED_AD_MOCO_PER_DAY} MOCO</strong> · 등록
              시 한 번에 차감
            </>
          )}
        </p>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">광고 이미지</label>
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
                <span className="text-sm text-muted-foreground">이미지 업로드</span>
                <input type="file" accept="image/*" className="hidden" onChange={onMainImagePick} />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">클릭 시 이동 링크</label>
          <Input
            placeholder="https://"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className={fieldClass}
            type="url"
            required
          />
        </div>

        {isOperator ? (
          <Button
            type="button"
            variant={operatorUnlimited ? "default" : "outline"}
            className={cn(
              "w-full rounded-xl h-10 text-sm",
              operatorUnlimited && "bg-folk-terracotta hover:bg-folk-terracotta/90 text-white"
            )}
            onClick={() => setOperatorUnlimited((v) => !v)}
          >
            {operatorUnlimited ? "날짜 제한 없음 (켜짐)" : "날짜 제한 없이 등록"}
          </Button>
        ) : null}

        <SponsoredAdSchedulePicker
          startTime={startTime}
          days={durationDays}
          isOperator={isOperator}
          unlimitedSchedule={operatorUnlimited}
          onChange={(nextStart, nextDays) => {
            setStartTime(nextStart);
            setDurationDays(nextDays);
          }}
        />

        {durationTooLong ? (
          <p className="text-xs text-destructive">
            기간은 최대 {EVENT_REGISTRATION_MAX_DAYS}일까지입니다.
          </p>
        ) : startInPast ? (
          <p className="text-xs text-destructive">시작 일시는 현재 시각 이후여야 합니다.</p>
        ) : insufficientMoco ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {durationDays}일({mocoCost} MOCO) 등록에 보유 {purchasedMoco.toLocaleString()} MOCO — 등록
            시 충전이 필요합니다
          </p>
        ) : isOperator ? (
          <p className="text-xs text-muted-foreground">
            운영자 등록 · {durationDays}일(24시간 × {durationDays}) · MOCO 차감 없음
            {operatorUnlimited ? " · 과거·장기 일정 허용" : ""}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {durationDays}일(24시간 × {durationDays}) · {mocoCost} MOCO 선차감 · 보유{" "}
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
            title="광고 이미지"
            description="스폰서 슬롯(4:5) 비율로 맞춰 주세요. 전체 이미지가 보이도록 조절한 뒤 원하는 영역을 선택하세요."
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
              등록 중…
            </>
          ) : (
            isOperator ? "광고 등록 (운영자)" : `${mocoCost} MOCO로 광고 등록`
          )}
        </Button>
        <PaymentLegalNotice compact className="mt-2" />
      </form>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            스폰서 노출 미리보기
          </p>
          <SponsorAdPreviewFrame
            imageUrl={mainImageUrl || null}
            ctaLabel={linkUrl.trim() ? "참가하기" : undefined}
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
