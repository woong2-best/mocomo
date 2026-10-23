import { idolGroupMetadata, renderIdolGroup } from "@/components/live/ai-host/idol-group-page";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return idolGroupMetadata("nangnang");
}

export default async function NangnangLivePage() {
  return renderIdolGroup("nangnang");
}
