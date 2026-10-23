import { idolGroupMetadata, renderIdolGroup } from "@/components/live/ai-host/idol-group-page";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return idolGroupMetadata("cleo");
}

export default async function AiriLivePage() {
  return renderIdolGroup("cleo");
}
