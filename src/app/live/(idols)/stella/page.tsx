import { idolGroupMetadata, renderIdolGroup } from "@/components/live/ai-host/idol-group-page";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return idolGroupMetadata("stella");
}

export default async function StellaLivePage() {
  return renderIdolGroup("stella");
}
