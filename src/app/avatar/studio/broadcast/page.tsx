import { redirect } from "next/navigation";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: "방송 스튜디오 | MoCoMo",
  description: "라이브 스튜디오",
};

/** Legacy broadcast studio → live studio */
export default function BroadcastStudioPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  redirect("/live/studio");
}
