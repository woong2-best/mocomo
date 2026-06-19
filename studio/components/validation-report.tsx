import type { ValidationIssue } from "@/studio/lib/validation";
import {
  STUDIO_MAX_FILE_BYTES,
  STUDIO_MAX_POLYGONS,
  STUDIO_MAX_TEXTURE_SIZE,
} from "@/studio/lib/constants";

export function ValidationReport({
  issues,
  polygonCount,
  fileSizeBytes,
  textureMaxSize,
}: {
  issues?: ValidationIssue[] | null;
  polygonCount?: number | null;
  fileSizeBytes?: number | null;
  textureMaxSize?: number | null;
}) {
  const checks = [
    {
      label: "파일 형식",
      ok: !issues?.some((i) => i.code === "format" && i.severity === "error"),
    },
    {
      label: `파일 크기 (≤${Math.round(STUDIO_MAX_FILE_BYTES / 1024 / 1024)}MB)`,
      ok: fileSizeBytes != null ? fileSizeBytes <= STUDIO_MAX_FILE_BYTES : null,
    },
    {
      label: `폴리곤 (≤${STUDIO_MAX_POLYGONS.toLocaleString()})`,
      ok: polygonCount != null ? polygonCount <= STUDIO_MAX_POLYGONS : null,
    },
    {
      label: `텍스처 (≤${STUDIO_MAX_TEXTURE_SIZE}px)`,
      ok: textureMaxSize != null ? textureMaxSize <= STUDIO_MAX_TEXTURE_SIZE : null,
    },
  ];

  return (
    <div className="rounded-xl border border-pink-100 bg-white p-4 text-sm">
      <h3 className="mb-2 font-medium">자동 검사</h3>
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2">
            <span>
              {c.ok === null ? "○" : c.ok ? "✓" : "✗"}
            </span>
            <span className={c.ok === false ? "text-destructive" : "text-muted-foreground"}>{c.label}</span>
          </li>
        ))}
      </ul>
      {issues?.length ? (
        <ul className="mt-2 space-y-1 text-xs text-destructive">
          {issues.filter((i) => i.severity === "error").map((i) => (
            <li key={i.code}>{i.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
