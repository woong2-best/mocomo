"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminStepUpDialog } from "@/components/admin/admin-step-up-dialog";
import { adminResetIdolBackdropAction, adminSaveIdolBackdropAction } from "@/actions/admin-idol-backdrop";
import {
  IDOL_BACKDROP_DEFAULTS,
  IDOL_BACKDROP_SLOTS,
  effectiveIdolBackdropUrl,
  type IdolBackdropSlot,
  type IdolBackdropUrls,
} from "@/lib/ai-live/idol-backdrop-shared";

const COPY: Record<IdolBackdropSlot, { title: string; body: string }> = {
  moco: { title: "Zelie", body: "기본은 침실 사진입니다. 라이브 화면 뒤에 깔립니다." },
  airi: { title: "Cleo", body: "기본은 학교 사물함·소파 방입니다." },
  chloe: { title: "Mio", body: "기본은 야경이 보이는 다다미 방입니다." },
  stella: { title: "Nangnang", body: "기본 배경은 없습니다. 올리면 라이브 뒤에 깔립니다." },
};

const ERRORS: Record<string, string> = {
  IDOL_BACKDROP_FILE: "사진 파일을 선택해 주세요.",
  IDOL_BACKDROP_TYPE: "JPG, PNG, WebP 사진만 올릴 수 있습니다.",
  IDOL_BACKDROP_SIZE: "파일이 너무 큽니다. 4MB를 넘지 않게 다시 선택해 주세요.",
  IDOL_BACKDROP_STORAGE: "저장소에 올리지 못했습니다. 잠시 후 다시 시도해 주세요.",
  IDOL_BACKDROP_SLOT: "어떤 아바타인지 알 수 없습니다.",
  IDOL_BACKDROP_RATE: "너무 자주 바꿨습니다. 1분 뒤에 다시 시도해 주세요.",
};

function messageFor(code: string): string {
  return ERRORS[code] ?? "저장하지 못했습니다. 다시 시도해 주세요.";
}

function SlotCard({
  slot,
  urls,
  draftUrl,
  pending,
  onPick,
  onSave,
  onReset,
}: {
  slot: IdolBackdropSlot;
  urls: IdolBackdropUrls;
  draftUrl: string | null;
  pending: boolean;
  onPick: (slot: IdolBackdropSlot, file: File) => void;
  onSave: (slot: IdolBackdropSlot) => void;
  onReset: (slot: IdolBackdropSlot) => void;
}) {
  const custom = urls[slot];
  const preview = draftUrl ?? effectiveIdolBackdropUrl(slot, custom);
  const copy = COPY[slot];
  const inputId = `idol-backdrop-${slot}`;

  return (
    <section className="space-y-3 rounded-2xl border border-border/70 p-5">
      <div>
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        {draftUrl ? "미리보기 · 아직 저장 전" : custom ? "지금: 바꾼 사진" : "지금: 기본 사진"}
      </p>
      <div
        className="relative aspect-video overflow-hidden rounded-xl bg-black bg-cover bg-center ring-1 ring-border/50"
        style={preview ? { backgroundImage: `url("${preview}")` } : undefined}
      >
        {preview ? null : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">기본 배경 없음</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          {copy.title} 배경 선택
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="max-w-full text-sm"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPick(slot, file);
          }}
        />
        <Button type="button" disabled={pending || !draftUrl} onClick={() => onSave(slot)}>
          이 사진으로 저장
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !custom}
          onClick={() => onReset(slot)}
        >
          기본 사진으로
        </Button>
      </div>
    </section>
  );
}

export function AdminIdolBackdropForm({ initial }: { initial: IdolBackdropUrls }) {
  const router = useRouter();
  const [urls, setUrls] = useState(initial);
  const [pendingUrl, setPendingUrl] = useState<Partial<Record<IdolBackdropSlot, string>>>({});
  const blobs = useRef<Partial<Record<IdolBackdropSlot, File>>>({});
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  function remember(next: IdolBackdropUrls, slot: IdolBackdropSlot) {
    const preview = pendingUrl[slot];
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    blobs.current[slot] = undefined;
    setPendingUrl((prev) => {
      const copy = { ...prev };
      delete copy[slot];
      return copy;
    });
    setUrls(next);
    router.refresh();
  }

  function onPick(slot: IdolBackdropSlot, file: File) {
    setMsg("");
    if (file.size > 4 * 1024 * 1024) {
      setMsg(messageFor("IDOL_BACKDROP_SIZE"));
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setMsg(messageFor("IDOL_BACKDROP_TYPE"));
      return;
    }
    const prev = pendingUrl[slot];
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    blobs.current[slot] = file;
    setPendingUrl((current) => ({ ...current, [slot]: URL.createObjectURL(file) }));
    setMsg("선택한 사진을 미리보기에 넣었습니다. 저장하면 라이브에 반영됩니다.");
  }

  function onSave(slot: IdolBackdropSlot) {
    const file = blobs.current[slot];
    if (!file) {
      setMsg("먼저 사진을 선택해 주세요. 선택하지 않으면 기본 사진이 유지됩니다.");
      return;
    }
    const run = () =>
      start(async () => {
        setMsg("");
        const form = new FormData();
        form.set("slot", slot);
        form.set("file", file);
        const res = await adminSaveIdolBackdropAction(form);
        if (!res.ok) {
          if (res.error === "ADMIN_STEPUP_REQUIRED") {
            retryRef.current = run;
            setStepUpOpen(true);
            return;
          }
          setMsg(messageFor(res.error));
          return;
        }
        remember(res.data, slot);
        setMsg("저장했습니다. 라이브 화면을 새로고침하면 바뀐 배경이 보입니다.");
      });
    run();
  }

  function onReset(slot: IdolBackdropSlot) {
    const run = () =>
      start(async () => {
        setMsg("");
        const res = await adminResetIdolBackdropAction(slot);
        if (!res.ok) {
          if (res.error === "ADMIN_STEPUP_REQUIRED") {
            retryRef.current = run;
            setStepUpOpen(true);
            return;
          }
          setMsg(messageFor(res.error));
          return;
        }
        remember(res.data, slot);
        setMsg("기본 사진으로 되돌렸습니다.");
      });
    run();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        사진을 올리지 않으면 지금 넣어 둔 기본 배경이 나옵니다. Zelie · Cleo · Mio는 기본 사진이 있고, Nangnang는
        올리지 않으면 단색입니다. 기본 파일은{" "}
        {IDOL_BACKDROP_SLOTS.filter((slot) => IDOL_BACKDROP_DEFAULTS[slot])
          .map((slot) => IDOL_BACKDROP_DEFAULTS[slot])
          .join(" · ")}
        입니다.
      </p>
      {IDOL_BACKDROP_SLOTS.map((slot) => (
        <SlotCard
          key={slot}
          slot={slot}
          urls={urls}
          draftUrl={pendingUrl[slot] ?? null}
          pending={pending}
          onPick={onPick}
          onSave={onSave}
          onReset={onReset}
        />
      ))}
      {msg ? <p className="text-sm">{msg}</p> : null}
      <AdminStepUpDialog
        open={stepUpOpen}
        onClose={() => setStepUpOpen(false)}
        onVerified={() => retryRef.current?.()}
      />
    </div>
  );
}
