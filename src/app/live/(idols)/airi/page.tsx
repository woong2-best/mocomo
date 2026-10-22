import { idolGroupMetadata } from "@/components/live/ai-host/idol-group-page";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return idolGroupMetadata("airi");
}

export default function AiriLivePage() {
  return null;
}
