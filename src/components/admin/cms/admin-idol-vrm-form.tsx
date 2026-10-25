"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminStepUpDialog } from "@/components/admin/admin-step-up-dialog";
import {
  adminConfirmIdolVrmUploadAction,
  adminPrepareIdolVrmUploadAction,
  adminResetIdolVrmAction,
} from "@/actions/admin-idol-vrm";
import {
  IDOL_VRM_MAX_BYTES,
  IDOL_VRM_SLOTS,
  effectiveIdolVrmUrl,
  isGltfBinary,
  type IdolVrmSlot,
  type IdolVrmUrls,
} from "@/lib/ai-live/idol-vrm-shared";

const MocoVrmStage = dynamic(
  () => import("@/components/live/ai-host/moco-vrm-stage").then((m) => m.MocoVrmStage),
  { ssr: false },
);

const COPY: Record<IdolVrmSlot, { title: string; body: string }> = {
  zelie: { title: "Zelie", body: "기본은 지금 넣어 둔 Zelie VRM입니다. 라이브와 허브 카드에 나옵니다." },
  cleo: { title: "Cleo", body: "기본은 Cleo VRM입니다." },
  mio: { title: "Mio", body: "기본은 Mio VRM입니다." },
  nangnang: { title: "Nangnang", body: "기본은 Nangnang VRM입니다." },
};

const ERRORS: Record<string, string> = {
  IDOL_VRM_FILE: "VRM 파일을 선택해 주세요.",
  IDOL_VRM_TYPE: "VRM 파일만 올릴 수 있습니다.",
  IDOL_VRM_SIZE: "파일이 너무 큽니다. 32MB를 넘지 않게 다시 선택해 주세요.",
  IDOL_VRM_STORAGE: "저장소에 올리지 못했습니다. 잠시 후 다시 시도해 주세요.",
  IDOL_VRM_SLOT: "어떤 아바타인지 알 수 없습니다.",
  IDOL_VRM_RATE: "너무 자주 바꿨습니다. 1분 뒤에 다시 시도해 주세요.",
};

function messageFor(code: string): string {
  return ERRORS[code] ?? "저장하지 못했습니다. 다시 시도해 주세요.";
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function putIdolVrm(uploadUrl: string, token: string | undefined, file: File): Promise<{ ok: boolean }> {
  const types = ["model/gltf-binary", "application/octet-stream"] as const;
  for (const type of types) {
    const headers: Record<string, string> = { "Content-Type": type };
    if (token) headers.Authorization = `Bearer ${token}`;
    const put = await fetch(uploadUrl, { method: "PUT", body: file, headers });
    if (put.ok) return { ok: true };
  }
  return { ok: false };
}

function SlotCard({
  slot,
  urls,
  draftUrl,
  draftName,
  pending,
  onPick,
  onSave,
  onReset,
}: {
  slot: IdolVrmSlot;
  urls: IdolVrmUrls;
  draftUrl: string | null;
  draftName: string | null;
  pending: boolean;
  onPick: (slot: IdolVrmSlot, file: File) => void;
  onSave: (slot: IdolVrmSlot) => void;
  onReset: (slot: IdolVrmSlot) => void;
}) {
  const custom = urls[slot];
  const preview = draftUrl ?? effectiveIdolVrmUrl(slot, custom);
  const copy = COPY[slot];
  const inputId = `idol-vrm-${slot}`;

  return (
    <section className="space-y-3 rounded-2xl border border-border/70 p-5">
      <div>
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        {draftUrl
          ? `미리보기 · 아직 저장 전${draftName ? ` · ${draftName}` : ""}`
          : custom
            ? "지금: 올린 VRM"
            : "지금: 기본 VRM"}
      </p>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black ring-1 ring-border/50">
        <MocoVrmStage key={preview} framing="bust" vrmUrl={preview} characterId={slot} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          {copy.title} VRM 선택
        </label>
        <input
          id={inputId}
          type="file"
          accept=".vrm,model/gltf-binary,application/octet-stream"
          className="max-w-full text-sm"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPick(slot, file);
          }}
        />
        <Button type="button" disabled={pending || !draftUrl} onClick={() => onSave(slot)}>
          이 파일로 저장
        </Button>
        <Button type="button" variant="outline" disabled={pending || !custom} onClick={() => onReset(slot)}>
          기본 VRM으로
        </Button>
      </div>
    </section>
  );
}

export function AdminIdolVrmForm({ initial }: { initial: IdolVrmUrls }) {
  const router = useRouter();
  const [urls, setUrls] = useState(initial);
  const [pendingUrl, setPendingUrl] = useState<Partial<Record<IdolVrmSlot, string>>>({});
  const [pendingName, setPendingName] = useState<Partial<Record<IdolVrmSlot, string>>>({});
  const blobs = useRef<Partial<Record<IdolVrmSlot, File>>>({});
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const retryRef = useRef<(() => void) | null>(null);

  function remember(next: IdolVrmUrls, slot: IdolVrmSlot) {
    const preview = pendingUrl[slot];
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    blobs.current[slot] = undefined;
    setPendingUrl((prev) => {
      const copy = { ...prev };
      delete copy[slot];
      return copy;
    });
    setPendingName((prev) => {
      const copy = { ...prev };
      delete copy[slot];
      return copy;
    });
    setUrls(next);
    router.refresh();
  }

  async function onPick(slot: IdolVrmSlot, file: File) {
    setMsg("");
    if (file.size > IDOL_VRM_MAX_BYTES) {
      setMsg(messageFor("IDOL_VRM_SIZE"));
      return;
    }
    if (!file.name.toLowerCase().endsWith(".vrm")) {
      setMsg(messageFor("IDOL_VRM_TYPE"));
      return;
    }
    const head = await file.slice(0, 12).arrayBuffer();
    if (!isGltfBinary(head)) {
      setMsg(messageFor("IDOL_VRM_TYPE"));
      return;
    }
    const prev = pendingUrl[slot];
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    blobs.current[slot] = file;
    setPendingUrl((current) => ({ ...current, [slot]: URL.createObjectURL(file) }));
    setPendingName((current) => ({ ...current, [slot]: `${file.name} · ${formatMb(file.size)}` }));
    setMsg("선택한 VRM을 미리보기에 넣었습니다. 저장하면 라이브에 반영됩니다.");
  }

  function onSave(slot: IdolVrmSlot) {
    const file = blobs.current[slot];
    if (!file) {
      setMsg("먼저 VRM 파일을 선택해 주세요. 선택하지 않으면 기본 파일이 유지됩니다.");
      return;
    }
    const run = () =>
      start(async () => {
        setMsg("");
        const prepared = await adminPrepareIdolVrmUploadAction(slot);
        if (!prepared.ok) {
          if (prepared.error === "ADMIN_STEPUP_REQUIRED") {
            retryRef.current = run;
            setStepUpOpen(true);
            return;
          }
          setMsg(messageFor(prepared.error));
          return;
        }
        const put = await putIdolVrm(prepared.uploadUrl, prepared.token, file);
        if (!put.ok) {
          setMsg(messageFor("IDOL_VRM_STORAGE"));
          return;
        }
        const res = await adminConfirmIdolVrmUploadAction(slot, prepared.publicUrl);
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
        setMsg("저장했습니다. 라이브 화면을 새로고침하면 바뀐 아바타가 보입니다.");
      });
    run();
  }

  function onReset(slot: IdolVrmSlot) {
    const run = () =>
      start(async () => {
        setMsg("");
        const res = await adminResetIdolVrmAction(slot);
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
        setMsg("기본 VRM으로 되돌렸습니다.");
      });
    run();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        VRM을 고른 뒤 반드시 <strong>이 파일로 저장</strong>을 누르세요. 저장 전에는 라이브가 바뀌지 않습니다.
        미리보기에 고른 파일이 나와야 합니다. 최대 {formatMb(IDOL_VRM_MAX_BYTES)}입니다.
      </p>
      {IDOL_VRM_SLOTS.map((slot) => (
        <SlotCard
          key={slot}
          slot={slot}
          urls={urls}
          draftUrl={pendingUrl[slot] ?? null}
          draftName={pendingName[slot] ?? null}
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
