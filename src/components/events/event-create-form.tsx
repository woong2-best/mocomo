"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createEventDraft } from "@/actions/events";
import { formatUsd } from "@/lib/money";
import {
  calcEventRegistrationFee,
  EVENT_REGISTRATION_MAX_DAYS,
  eventDurationDays,
  eventRegistrationFeeLabel,
  EVENT_TYPES,
  type EventLinkInput,
} from "@/lib/event-registration";
import { uploadImageBlob } from "@/lib/client-upload";
import { fileToUploadableJpeg, isGalleryImageFile } from "@/lib/gallery-image-upload";
import { EventCard } from "@/components/events/event-card";
import { PaymentLegalNotice } from "@/components/legal/legal-entity-notice";
import { PayButton } from "@/components/payments/pay-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageCropDialog } from "@/components/media/image-crop-dialog";
import {
  ChevronDown,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
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
  paymentsEnabled,
  paidEventId,
}: {
  paymentsEnabled: boolean;
  paidEventId?: string | null;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("fanart");
  const [startsAt, setStartsAt] = useState(defaultStartDate);
  const [endsAt, setEndsAt] = useState(defaultEndDate);
  const [prize, setPrize] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [links, setLinks] = useState<EventLinkInput[]>([{ label: "", url: "" }]);
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [eventId, setEventId] = useState<string | null>(paidEventId ?? null);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const durationDays = useMemo(
    () => eventDurationDays(startsAt, endsAt),
    [startsAt, endsAt]
  );
  const registrationFee = useMemo(
    () => calcEventRegistrationFee(startsAt, endsAt),
    [startsAt, endsAt]
  );
  const durationTooLong = durationDays > EVENT_REGISTRATION_MAX_DAYS;

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

  async function onImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => isGalleryImageFile(f, true));
    if (list.length === 0) {
      setError("이미지 파일을 선택해 주세요.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of list.slice(0, 6)) {
        const prepared = await fileToUploadableJpeg(file);
        const url = await uploadImageBlob(prepared, prepared.name);
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls].slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!mainImageUrl.trim()) {
      setError("대표 이미지를 등록해 주세요.");
      return;
    }
    if (durationTooLong) {
      setError(`이벤트 기간은 최대 ${EVENT_REGISTRATION_MAX_DAYS}일까지 가능합니다.`);
      return;
    }
    const extraLinks = links.filter((l) => l.url.trim());
    const res = await createEventDraft({
      title,
      description,
      type,
      startsAt,
      endsAt,
      prize: prize || undefined,
      imageUrl: mainImageUrl,
      images,
      linkUrl: linkUrl || undefined,
      links: extraLinks,
      videoUrl: videoUrl || undefined,
    });
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("eventId" in res && res.eventId) setEventId(res.eventId);
  }

  if (paidEventId) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4">
        <p className="font-semibold text-foreground">이벤트 등록이 완료되었습니다!</p>
        <p className="text-sm text-muted-foreground">
          결제가 확인되었고, 다른 사용자도 이벤트 목록에서 보고 참가할 수 있습니다.
        </p>
        <Link href="/events">
          <Button className="w-full rounded-xl bg-[#A855F7] hover:bg-[#C084FC]">
            이벤트 목록으로
          </Button>
        </Link>
      </div>
    );
  }

  if (eventId) {
    return (
      <div className="rounded-2xl border border-[#A855F7]/30 bg-[#A855F7]/5 p-6 space-y-4">
        <p className="font-semibold text-foreground">이벤트 정보가 저장되었습니다.</p>
        <p className="text-sm text-muted-foreground">
          목록에 공개하려면 등록비{" "}
          <strong className="text-foreground">{formatUsd(registrationFee)}</strong>
          을 결제해 주세요. ({eventRegistrationFeeLabel(startsAt, endsAt)})
        </p>
        {paymentsEnabled ? (
          <>
            <PayButton
              type="EVENT_REGISTRATION"
              amount={registrationFee}
              orderName="MoCoMo 이벤트 등록"
              metadata={{ eventId }}
              className="w-full rounded-2xl"
              showLegalNotice
            >
              {formatUsd(registrationFee)} 결제하고 공개하기
            </PayButton>
          </>
        ) : (
          <p className="text-sm text-destructive">
            결제 설정(Stripe)이 필요합니다. 관리자에게 문의해 주세요.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <form
        onSubmit={submitDraft}
        className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">이벤트 제목</label>
          <Input
            placeholder="예: Summer Fanart Contest"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
            required
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">유형</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={fieldClass}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">설명</label>
          <textarea
            placeholder="이벤트 소개를 적어주세요"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(fieldClass, "min-h-[120px] resize-y")}
            required
            maxLength={8000}
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
            ) : (
              <p className="text-xs text-muted-foreground">
                등록비: {eventRegistrationFeeLabel(startsAt, endsAt)}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">대표 링크</label>
          <Input
            placeholder="https://"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className={fieldClass}
            type="url"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">대표 이미지</label>
          <div className="flex flex-wrap gap-2">
            {mainImageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainImageUrl}
                  alt=""
                  className="h-28 w-28 rounded-xl object-cover border border-border aspect-square"
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
              <label className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border aspect-square hover:border-[#A855F7]/40 hover:bg-[#A855F7]/5 transition-colors">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onMainImagePick}
                />
              </label>
            )}
          </div>
        </div>

        {/* Advanced */}
        <div className="border-t border-border pt-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>고급 설정</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                advancedOpen && "rotate-180"
              )}
            />
          </button>

          {advancedOpen && (
            <div className="mt-3 space-y-5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">추가 링크</p>
                {links.map((link, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="라벨"
                      value={link.label}
                      onChange={(e) => {
                        const next = [...links];
                        next[i] = { ...next[i], label: e.target.value };
                        setLinks(next);
                      }}
                      className={cn(fieldClass, "flex-1")}
                    />
                    <Input
                      placeholder="https://"
                      value={link.url}
                      onChange={(e) => {
                        const next = [...links];
                        next[i] = { ...next[i], url: e.target.value };
                        setLinks(next);
                      }}
                      className={cn(fieldClass, "flex-[2]")}
                      type="url"
                    />
                    {links.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground"
                        onClick={() => setLinks(links.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {links.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 rounded-xl"
                    onClick={() => setLinks([...links, { label: "", url: "" }])}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    링크 추가
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">소개 영상</label>
                <Input
                  placeholder="YouTube / VOD URL"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className={fieldClass}
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  추가 이미지 (최대 8장)
                </label>
                <div className="flex flex-wrap gap-2">
                  {images.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover border border-border"
                    />
                  ))}
                  <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border hover:border-[#A855F7]/40">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={onImages}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">상품 정보</label>
                <Input
                  placeholder="예: 굿즈 세트, 디지털 리워드"
                  value={prize}
                  onChange={(e) => setPrize(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {cropSrc && (
          <ImageCropDialog
            open={cropOpen}
            onOpenChange={closeCropDialog}
            imageSrc={cropSrc}
            aspect={1}
            lockAspect
            title="대표 이미지"
            description="1:1 비율로 잘라 주세요."
            maxWidth={1200}
            maxHeight={1200}
            uploadFilename="event-main.jpg"
            onComplete={(url) => {
              setMainImageUrl(url);
              closeCropDialog(false);
            }}
          />
        )}

        <Button
          type="submit"
          className="w-full rounded-xl bg-[#A855F7] hover:bg-[#C084FC]"
          disabled={uploading || durationTooLong}
        >
          다음: 등록비 결제 ({formatUsd(registrationFee)})
        </Button>
        <PaymentLegalNotice compact className="mt-2" />
        <p className="text-center text-xs text-muted-foreground">
          {eventRegistrationFeeLabel(startsAt, endsAt)} · 등록비 결제 후 목록에 공개됩니다.
        </p>
      </form>

      {/* Desktop sticky preview */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Preview
          </p>
          <EventCard
            interactive={false}
            event={{
              title: title || "이벤트 제목",
              type,
              imageUrl: mainImageUrl || null,
              endsAt: endsAt || new Date(),
              participantCount: 0,
              likeCount: 0,
            }}
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            제목·이미지·유형·종료일이 카드에 실시간으로 반영됩니다.
          </p>
          <PaymentLegalNotice />
        </div>
      </aside>

      {/* Mobile preview below form (always visible, not only advanced) */}
      <div className="space-y-2 lg:hidden -mt-4">
        <p className="text-xs font-medium text-muted-foreground">실시간 미리보기</p>
        <EventCard
          interactive={false}
          className="max-w-[240px]"
          event={{
            title: title || "이벤트 제목",
            type,
            imageUrl: mainImageUrl || null,
            endsAt: endsAt || new Date(),
            participantCount: 0,
            likeCount: 0,
          }}
        />
        <PaymentLegalNotice compact />
      </div>
    </div>
  );
}
