"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { registerEventSponsoredAd } from "@/actions/sponsored-ad";
import {
  EVENT_REGISTRATION_MAX_DAYS,
  eventDurationDays,
} from "@/lib/event-registration";
import { uploadImageBlob } from "@/lib/client-upload";
import { fileToUploadableJpeg, isGalleryImageFile } from "@/lib/gallery-image-upload";
import {
  calcSponsoredAdMoco,
  SPONSORED_AD_ASPECT,
  SPONSORED_AD_IMAGE_MAX_HEIGHT,
  SPONSORED_AD_IMAGE_MAX_WIDTH,
  SPONSORED_AD_MAX_DAYS,
  SPONSORED_AD_MOCO_PER_DAY,
} from "@/lib/sponsored-ad/constants";
import { EventAdEditPanel } from "@/components/events/event-ad-edit-panel";
import { SponsorAdPreviewFrame } from "@/components/events/sponsor-ad-preview-frame";
import { PaymentLegalNotice } from "@/components/legal/legal-entity-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageCropDialog } from "@/components/media/image-crop-dialog";
import { cn } from "@/lib/utils";

function defaultEndDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 16);
}

function defaultStartDate() {
  return new Date().toISOString().slice(0, 16);
}

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40";

export function EventCreateForm({
  purchasedMoco = 0,
  paidEventId,
  paidLinkUrl,
  paidImageUrl,
}: {
  purchasedMoco?: number;
  paidEventId?: string | null;
  paidLinkUrl?: string | null;
  paidImageUrl?: string | null;
}) {
  const [startsAt, setStartsAt] = useState(defaultStartDate);
  const [endsAt, setEndsAt] = useState(defaultEndDate);
  const [linkUrl, setLinkUrl] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registeredEventId, setRegisteredEventId] = useState<string | null>(paidEventId ?? null);
  const [successLinkUrl, setSuccessLinkUrl] = useState(paidLinkUrl ?? "");
  const [successImageUrl, setSuccessImageUrl] = useState(paidImageUrl ?? "");
  const [error, setError] = useState("");

  const durationDays = useMemo(
    () => eventDurationDays(startsAt, endsAt),
    [startsAt, endsAt]
  );

  const mocoCost = useMemo(() => {
    try {
      return calcSponsoredAdMoco(durationDays);
    } catch {
      return null;
    }
  }, [durationDays]);

  const maxAffordableDays = Math.floor(purchasedMoco / SPONSORED_AD_MOCO_PER_DAY);
  const maxSelectableDays = Math.min(
    EVENT_REGISTRATION_MAX_DAYS,
    SPONSORED_AD_MAX_DAYS,
    maxAffordableDays
  );
  const durationTooLong = durationDays > EVENT_REGISTRATION_MAX_DAYS;
  const cannotAffordDuration =
    mocoCost != null && (purchasedMoco < mocoCost || durationDays > maxAffordableDays);
  const hasMoco = purchasedMoco >= SPONSORED_AD_MOCO_PER_DAY;

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

    if (!hasMoco) {
      setError("MOCO가 없으면 광고를 등록할 수 없습니다.");
      return;
    }
    if (!mainImageUrl.trim()) {
      setError("광고 이미지를 등록해 주세요.");
      return;
    }
    if (!linkUrl.trim()) {
      setError("클릭 시 이동할 링크를 입력해 주세요.");
      return;
    }
    if (durationTooLong) {
      setError(`광고 기간은 최대 ${EVENT_REGISTRATION_MAX_DAYS}일까지 가능합니다.`);
      return;
    }
    if (cannotAffordDuration || mocoCost == null) {
      setError(
        `보유 MOCO(${purchasedMoco.toLocaleString()})로는 ${durationDays}일(${mocoCost ?? "—"} MOCO)을 결제할 수 없습니다.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerEventSponsoredAd({
        imageUrl: mainImageUrl,
        linkUrl,
        startsAt,
        endsAt,
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

  if (!hasMoco) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3 text-center">
        <p className="font-semibold text-foreground">MOCO가 필요합니다</p>
        <p className="text-sm text-muted-foreground">
          광고 등록은 24시간(1일)당 1 MOCO입니다. 보유 MOCO가 없으면 등록할 수 없습니다.
        </p>
        <Link href="/wallet">
          <Button className="rounded-xl bg-[#A855F7] hover:bg-[#C084FC]">지갑에서 MOCO 충전</Button>
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
          이미지·링크·노출 기간만 등록합니다. 24시간(1일)당{" "}
          <strong className="text-foreground">{SPONSORED_AD_MOCO_PER_DAY} MOCO</strong> · 등록 시
          한 번에 차감
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">시작일</label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={fieldClass}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">종료일</label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={fieldClass}
              required
            />
            {durationTooLong ? (
              <p className="text-xs text-destructive">
                기간은 최대 {EVENT_REGISTRATION_MAX_DAYS}일까지입니다.
              </p>
            ) : cannotAffordDuration ? (
              <p className="text-xs text-destructive">
                보유 {purchasedMoco.toLocaleString()} MOCO로는 {durationDays}일(
                {mocoCost} MOCO) 결제 불가 · 최대 {maxSelectableDays}일
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {durationDays}일 · {mocoCost} MOCO 선차감
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          보유 purchasedMoco: {purchasedMoco.toLocaleString()} · 결제 가능 최대{" "}
          {maxSelectableDays}일
        </p>

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
            submitting ||
            durationTooLong ||
            cannotAffordDuration ||
            !mainImageUrl.trim() ||
            !linkUrl.trim()
          }
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              등록 중…
            </>
          ) : (
            `${mocoCost ?? 0} MOCO로 광고 등록`
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
