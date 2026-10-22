import { idolGroupMetadata, renderIdolGroup } from "@/components/live/ai-host/idol-group-page";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return idolGroupMetadata("chloe");
}

export default async function ChloeLivePage() {
  return renderIdolGroup("chloe");
}
