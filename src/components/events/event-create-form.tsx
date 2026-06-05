"use client";

import { useState } from "react";
import Link from "next/link";
import { createEventDraft } from "@/actions/events";
import {
  EVENT_REGISTRATION_FEE_KRW,
  EVENT_TYPES,
  type EventLinkInput,
} from "@/lib/event-registration";
import { uploadImageBlob } from "@/lib/client-upload";
import { fileToUploadableJpeg, isGalleryImageFile } from "@/lib/gallery-image-upload";
import { PayButton } from "@/components/payments/pay-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";

function defaultEndDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 16);
}

function defaultStartDate() {
  return new Date().toISOString().slice(0, 16);
}

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
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [eventId, setEventId] = useState<string | null>(paidEventId ?? null);
  const [error, setError] = useState("");

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
    const extraLinks = links.filter((l) => l.url.trim());
    const res = await createEventDraft({
      title,
      description,
      type,
      startsAt,
      endsAt,
      prize: prize || undefined,
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
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 space-y-4">
        <p className="font-semibold">이벤트 등록이 완료되었습니다!</p>
        <p className="text-sm text-muted-foreground">
          결제가 확인되었고, 다른 사용자도 이벤트 목록에서 보고 참가할 수 있습니다.
        </p>
        <Link href="/events">
          <Button className="rounded-xl w-full">이벤트 목록으로</Button>
        </Link>
      </div>
    );
  }

  if (eventId) {
    return (
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6 space-y-4">
        <p className="font-semibold">이벤트 정보가 저장되었습니다.</p>
        <p className="text-sm text-muted-foreground">
          목록에 공개하려면 등록비{" "}
          <strong>{EVENT_REGISTRATION_FEE_KRW.toLocaleString()}원</strong>을 결제해 주세요.
        </p>
        {paymentsEnabled ? (
          <PayButton
            type="EVENT_REGISTRATION"
            amount={EVENT_REGISTRATION_FEE_KRW}
            orderName="MoCoMo 이벤트 등록"
            metadata={{ eventId }}
            className="w-full rounded-2xl"
          >
            {EVENT_REGISTRATION_FEE_KRW.toLocaleString()}원 결제하고 공개하기
          </PayButton>
        ) : (
          <p className="text-sm text-destructive">
            결제 설정(Stripe)이 필요합니다. 관리자에게 문의해 주세요.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          결제 후 자동으로 이벤트 목록에 노출됩니다.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submitDraft}
      className="space-y-4 rounded-2xl border border-border/60 p-5 bg-card"
    >
      <Input
        placeholder="이벤트 제목 (예: 팬아트 대회)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-xl"
        required
        maxLength={120}
      />

      <div>
        <label className="text-sm font-medium text-muted-foreground">유형</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        placeholder="이벤트 설명 (규칙, 참가 방법, 주의사항 등)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full min-h-[140px] rounded-xl border border-border bg-background p-3 text-sm"
        required
        maxLength={8000}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">시작</label>
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="rounded-xl mt-1"
            required
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">종료</label>
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="rounded-xl mt-1"
            required
          />
        </div>
      </div>

      <Input
        placeholder="상품·경품 (선택, 예: 굿즈 세트)"
        value={prize}
        onChange={(e) => setPrize(e.target.value)}
        className="rounded-xl"
      />

      <Input
        placeholder="대표 링크 URL (참가 양식, 공지 등)"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        className="rounded-xl"
        type="url"
      />

      <div className="space-y-2">
        <p className="text-sm font-medium">추가 링크 (선택)</p>
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
              className="rounded-xl flex-1"
            />
            <Input
              placeholder="https://"
              value={link.url}
              onChange={(e) => {
                const next = [...links];
                next[i] = { ...next[i], url: e.target.value };
                setLinks(next);
              }}
              className="rounded-xl flex-[2]"
              type="url"
            />
            {links.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
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
            className="rounded-xl gap-1"
            onClick={() => setLinks([...links, { label: "", url: "" }])}
          >
            <Plus className="h-3.5 w-3.5" />
            링크 추가
          </Button>
        )}
      </div>

      <Input
        placeholder="소개 영상 URL (선택)"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        className="rounded-xl"
        type="url"
      />

      <div>
        <label className="text-sm font-medium">이미지 (최대 8장)</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-20 w-20 rounded-lg object-cover border" />
          ))}
          <label className="h-20 w-20 rounded-lg border border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full rounded-2xl" disabled={uploading}>
        다음: 등록비 결제 ({EVENT_REGISTRATION_FEE_KRW.toLocaleString()}원)
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        등록비 결제 후 다른 사용자에게 이벤트가 공개됩니다.
      </p>
    </form>
  );
}
