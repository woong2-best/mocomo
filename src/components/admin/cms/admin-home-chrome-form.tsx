"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminStepUpDialog } from "@/components/admin/admin-step-up-dialog";
import { applyHomeChromeVars } from "@/components/home/home-chrome-sync";
import { adminResetHomeChromeAction, adminSaveHomeChromeAction } from "@/actions/admin-home-chrome";
import {
  HOME_CHROME_DEFAULTS,
  HOME_CHROME_SIZE,
  effectiveHomeChromeSrc,
  type HomeChromeSlot,
  type HomeChromeUrls,
} from "@/lib/home-chrome-shared";

const COPY: Record<
  HomeChromeSlot,
  { title: string; body: string }
> = {
  sidebar: {
    title: "왼쪽 메뉴 배경",
    body: "데스크톱 왼쪽 메뉴에 쓰입니다. 비율은 363×1024이고, 화면에서는 높이에 맞춘 뒤 오른쪽이 조금 잘립니다. 지금 사진과 같은 방식입니다.",
  },
  hero: {
    title: "가운데 환영 배너",
    body: "로그인하지 않은 홈 화면 가운데에 쓰입니다. 비율은 1024×682이고, 배너 안을 가운데 기준으로 채웁니다. 지금 사진과 같은 방식입니다.",
  },
};

const ERRORS: Record<string, string> = {
  HOME_CHROME_FILE: "사진 파일을 선택해 주세요.",
  HOME_CHROME_TYPE: "JPG, PNG, WebP 사진만 올릴 수 있습니다.",
  HOME_CHROME_SIZE: "파일이 너무 큽니다. 자른 사진이 4MB를 넘지 않게 다시 선택해 주세요.",
  HOME_CHROME_DIMENSIONS: "사진 비율이 맞지 않아 저장하지 않았습니다. 다시 선택해 주세요.",
  HOME_CHROME_STORAGE: "저장소에 올리지 못했습니다. 잠시 후 다시 시도해 주세요.",
  HOME_CHROME_SLOT: "어떤 사진인지 알 수 없습니다.",
  HOME_CHROME_RATE: "너무 자주 바꿨습니다. 1분 뒤에 다시 시도해 주세요.",
  TYPE: "이 파일은 사진으로 열 수 없습니다. JPG, PNG, WebP를 선택해 주세요.",
  CANVAS: "이 브라우저에서는 사진을 자를 수 없습니다. Chrome으로 다시 시도해 주세요.",
};

function messageFor(code: string, slot?: HomeChromeSlot): string {
  if (code === "SMALL" && slot) {
    const size = HOME_CHROME_SIZE[slot];
    return `사진이 너무 작습니다. 가로 ${size.width}px, 세로 ${size.height}px 이상인 사진을 올려 주세요.`;
  }
  return ERRORS[code] ?? "저장하지 못했습니다. 다시 시도해 주세요.";
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

async function loadSource(file: File): Promise<{
  width: number;
  height: number;
  source: CanvasImageSource;
  close: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() };
    } catch {
      try {
        const bitmap = await createImageBitmap(file);
        return { width: bitmap.width, height: bitmap.height, source: bitmap, close: () => bitmap.close() };
      } catch {
        /* HTMLImageElement below */
      }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("TYPE"));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      source: img,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** Cover-crop to the shipped pixel size so the existing CSS frames it the same way. */
export async function cropHomeChromeFile(file: File, slot: HomeChromeSlot): Promise<Blob> {
  if (file.size > 25 * 1024 * 1024) throw new Error("HOME_CHROME_SIZE");
  const target = HOME_CHROME_SIZE[slot];
  const image = await loadSource(file);
  try {
    if (image.width < target.width || image.height < target.height) throw new Error("SMALL");
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CANVAS");
    const scale = Math.max(target.width / image.width, target.height / image.height);
    const sw = target.width / scale;
    const sh = target.height / scale;
    const sx = (image.width - sw) / 2;
    const sy = (image.height - sh) / 2;
    ctx.drawImage(image.source, sx, sy, sw, sh, 0, 0, target.width, target.height);
    const webp = await canvasToBlob(canvas, "image/webp", 0.92);
    const jpeg =
      webp && webp.size > 32 && webp.size <= 4 * 1024 * 1024
        ? null
        : await canvasToBlob(canvas, "image/jpeg", 0.92);
    const blob = webp && webp.size > 32 && webp.size <= 4 * 1024 * 1024 ? webp : jpeg;
    if (!blob || blob.size <= 32 || blob.size > 4 * 1024 * 1024) throw new Error("HOME_CHROME_SIZE");
    if (typeof createImageBitmap === "function") {
      try {
        const check = await createImageBitmap(blob);
        try {
          if (check.width !== target.width || check.height !== target.height) {
            throw new Error("HOME_CHROME_DIMENSIONS");
          }
        } finally {
          check.close();
        }
      } catch (e) {
        if (e instanceof Error && e.message === "HOME_CHROME_DIMENSIONS") throw e;
      }
    }
    return blob;
  } finally {
    image.close();
  }
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
  slot: HomeChromeSlot;
  urls: HomeChromeUrls;
  draftUrl: string | null;
  pending: boolean;
  onPick: (slot: HomeChromeSlot, file: File) => void;
  onSave: (slot: HomeChromeSlot) => void;
  onReset: (slot: HomeChromeSlot) => void;
}) {
  const custom = slot === "sidebar" ? urls.sidebarImageUrl : urls.heroImageUrl;
  const preview = draftUrl ?? effectiveHomeChromeSrc(slot, custom);
  const copy = COPY[slot];
  const inputId = `home-chrome-${slot}`;

  return (
    <section className="space-y-3 rounded-2xl border border-border/70 p-5">
      <div>
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        {draftUrl ? "미리보기 · 아직 저장 전" : custom ? "지금: 바꾼 사진" : "지금: 기본 사진"}
      </p>
      {slot === "sidebar" ? (
        <div
          className="folk-sidebar-panel w-[var(--sidebar-w)] overflow-hidden rounded-2xl border border-white/10"
          style={{ height: "36rem", backgroundImage: `url("${preview}")` }}
        />
      ) : (
        <div
          className="folk-hero-banner"
          style={{ marginBottom: 0, backgroundImage: `url("${preview}")` }}
        >
          <p className="text-lg font-semibold text-white">Welcome to MoCoMo</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          {copy.title} 사진 선택
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
        <Button type="button" variant="outline" disabled={pending || !custom} onClick={() => onReset(slot)}>
          기본 사진으로
        </Button>
      </div>
    </section>
  );
}

export function AdminHomeChromeForm({ initial }: { initial: HomeChromeUrls }) {
  const router = useRouter();
  const [urls, setUrls] = useState(initial);
  const [pendingUrl, setPendingUrl] = useState<Partial<Record<HomeChromeSlot, string>>>({});
  const blobs = useRef<Partial<Record<HomeChromeSlot, Blob>>>({});
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  function remember(next: HomeChromeUrls, slot: HomeChromeSlot) {
    const preview = pendingUrl[slot];
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    blobs.current[slot] = undefined;
    setPendingUrl((prev) => {
      const copy = { ...prev };
      delete copy[slot];
      return copy;
    });
    setUrls(next);
    applyHomeChromeVars(next);
    router.refresh();
  }

  async function onPick(slot: HomeChromeSlot, file: File) {
    setMsg("");
    try {
      const blob = await cropHomeChromeFile(file, slot);
      const prev = pendingUrl[slot];
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      blobs.current[slot] = blob;
      setPendingUrl((current) => ({ ...current, [slot]: URL.createObjectURL(blob) }));
      const size = HOME_CHROME_SIZE[slot];
      setMsg(`선택한 사진을 ${size.width}×${size.height}에 맞춰 두었습니다. 저장하면 사이트에 반영됩니다.`);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setMsg(messageFor(code, slot));
    }
  }

  function onSave(slot: HomeChromeSlot) {
    const blob = blobs.current[slot];
    if (!blob) {
      setMsg("먼저 사진을 선택해 주세요. 선택하지 않으면 기본 사진이 유지됩니다.");
      return;
    }
    const run = () =>
      start(async () => {
        setMsg("");
        const ext = blob.type === "image/jpeg" ? "jpg" : "webp";
        const form = new FormData();
        form.set("slot", slot);
        form.set("file", new File([blob], `home-${slot}.${ext}`, { type: blob.type || "image/webp" }));
        const res = await adminSaveHomeChromeAction(form);
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
        setMsg("저장했습니다. 이미 열려 있는 화면은 새로고침하면 바뀐 사진이 보입니다.");
      });
    run();
  }

  function onReset(slot: HomeChromeSlot) {
    const run = () =>
      start(async () => {
        setMsg("");
        const res = await adminResetHomeChromeAction(slot);
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
        사진을 올리지 않아도 지금 사이트에 있는 두 장이 기본으로 나옵니다. 새 사진은 그 비율에 맞게
        가운데를 기준으로 잘리며, 늘리거나 찌그러뜨리지 않습니다. 기본 파일은{" "}
        <span className="font-medium text-foreground">{HOME_CHROME_DEFAULTS.sidebar}</span>
        {" · "}
        <span className="font-medium text-foreground">{HOME_CHROME_DEFAULTS.hero}</span>
        입니다.
      </p>
      <SlotCard
        slot="sidebar"
        urls={urls}
        draftUrl={pendingUrl.sidebar ?? null}
        pending={pending}
        onPick={onPick}
        onSave={onSave}
        onReset={onReset}
      />
      <SlotCard
        slot="hero"
        urls={urls}
        draftUrl={pendingUrl.hero ?? null}
        pending={pending}
        onPick={onPick}
        onSave={onSave}
        onReset={onReset}
      />
      {msg ? <p className="text-sm">{msg}</p> : null}
      <AdminStepUpDialog
        open={stepUpOpen}
        onClose={() => setStepUpOpen(false)}
        onVerified={() => retryRef.current?.()}
      />
    </div>
  );
}
