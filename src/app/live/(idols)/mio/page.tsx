import { idolGroupMetadata, renderIdolGroup } from "@/components/live/ai-host/idol-group-page";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return idolGroupMetadata("mio");
}

export default async function MioLivePage() {
  return renderIdolGroup("mio");
}
