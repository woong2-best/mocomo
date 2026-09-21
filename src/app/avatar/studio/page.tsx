import { redirect } from "next/navigation";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: "스튜디오 | MoCoMo",
  description: "라이브 스튜디오",
};

/** Legacy avatar studio hub → live studio */
export default function AvatarStudioHubPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  redirect("/live/studio");
}
