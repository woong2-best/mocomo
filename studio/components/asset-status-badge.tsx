import type { StudioAssetStatus } from "@prisma/client";
import { STUDIO_STATUS_LABELS } from "@/studio/lib/constants";

const STATUS_STYLE: Record<StudioAssetStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-secondary text-secondary-foreground",
  REVIEWING: "bg-accent/30 text-foreground",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-destructive/15 text-destructive",
  PUBLISHED: "bg-primary/15 text-primary",
};

export function AssetStatusBadge({ status }: { status: StudioAssetStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
      {STUDIO_STATUS_LABELS[status]}
    </span>
  );
}
