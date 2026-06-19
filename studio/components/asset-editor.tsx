"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { StudioAsset } from "@prisma/client";
import {
  attachStudioAssetFile,
  deleteStudioAsset,
  publishApprovedAsset,
  submitStudioAssetForReview,
} from "@/studio/actions/assets";
import { AssetPreviewViewer } from "./asset-preview-viewer";
import { AssetStatusBadge } from "./asset-status-badge";
import { STUDIO_CATEGORY_LABELS } from "@/studio/lib/constants";
import { Button } from "@/components/ui/button";

export function AssetEditor({ asset, canEdit }: { asset: StudioAsset; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(asset.glbUrl);
  const [stats, setStats] = useState<{ polygonCount: number; textureMaxSize: number } | null>(null);

  const onStats = useCallback((s: { polygonCount: number; textureMaxSize: number }) => {
    setStats(s);
  }, []);

  async function uploadFile(file: File) {
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("assetId", asset.id);
    if (stats) {
      form.append("polygonCount", String(stats.polygonCount));
      form.append("textureMaxSize", String(stats.textureMaxSize));
    }

    const res = await fetch("/api/studio/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "업로드 실패");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    startTransition(async () => {
      const attach = await attachStudioAssetFile(asset.id, {
        glbUrl: data.publicUrl,
        fileSizeBytes: file.size,
        filename: file.name,
        polygonCount: stats?.polygonCount,
        textureMaxSize: stats?.textureMaxSize,
      });
      if (attach.error) setError(attach.error);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold">{asset.name}</h1>
          <AssetStatusBadge status={asset.status} />
        </div>
        <p className="text-sm text-muted-foreground">{STUDIO_CATEGORY_LABELS[asset.category]}</p>
        {asset.description && <p className="text-sm">{asset.description}</p>}
        {asset.rejectReason && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            반려 사유: {asset.rejectReason}
          </div>
        )}

        {previewUrl ? (
          <AssetPreviewViewer url={previewUrl} className="h-[360px] w-full rounded-2xl border border-pink-100" onStats={onStats} />
        ) : (
          <div className="flex h-[360px] items-center justify-center rounded-2xl border border-dashed border-pink-200 bg-pink-50/50 text-muted-foreground">
            3D 파일을 업로드하면 미리보기가 표시됩니다
          </div>
        )}

        {canEdit && (asset.status === "DRAFT" || asset.status === "REJECTED") && (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-pink-300 bg-white p-6 text-sm hover:bg-pink-50">
            <span className="font-medium text-pink-600">.glb / .gltf 업로드</span>
            <span className="mt-1 text-xs text-muted-foreground">최대 50MB · 자동 검사</span>
            <input
              type="file"
              accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
              }}
            />
          </label>
        )}

        {asset.polygonCount != null && (
          <p className="text-xs text-muted-foreground">
            폴리곤 {asset.polygonCount.toLocaleString()} · 파일 {((asset.fileSizeBytes ?? 0) / 1024).toFixed(1)}KB
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-medium">작업</h2>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {canEdit && asset.status === "DRAFT" && asset.glbUrl && (
          <Button
            className="w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await submitStudioAssetForReview(asset.id);
                if (r.error) setError(r.error);
                else router.refresh();
              })
            }
          >
            검수 제출
          </Button>
        )}

        {canEdit && asset.status === "APPROVED" && (
          <Button
            className="w-full"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await publishApprovedAsset(asset.id);
                if (r.error) setError(r.error);
                else router.refresh();
              })
            }
          >
            마켓 배포
          </Button>
        )}

        {canEdit && asset.status !== "PUBLISHED" && (
          <Button
            variant="outline"
            className="w-full text-destructive"
            disabled={pending}
            onClick={() => {
              if (!confirm("삭제할까요?")) return;
              startTransition(async () => {
                const r = await deleteStudioAsset(asset.id);
                if (r.error) setError(r.error);
                else router.push("/studio/assets");
              });
            }}
          >
            삭제
          </Button>
        )}

        {asset.status === "PUBLISHED" && asset.glbUrl && (
          <a href={asset.glbUrl} download className="block">
            <Button variant="outline" className="w-full">
              GLB 다운로드
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
