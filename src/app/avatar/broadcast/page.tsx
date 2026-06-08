import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { AvatarBroadcastView, type BroadcastBgMode } from "@/components/avatar/avatar-broadcast-view";

export const metadata = {
  title: "아바타 방송 | MoCoMo",
  description: "OBS 브라우저 소스용 투명/크로마키 VTuber 아바타",
};

export default async function AvatarBroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{ bg?: string }>;
}) {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/avatar/broadcast");

  const params = await searchParams;
  const bg: BroadcastBgMode =
    params.bg === "chroma" ? "chroma" : params.bg === "normal" ? "normal" : "transparent";

  return <AvatarBroadcastView bgMode={bg} />;
}
