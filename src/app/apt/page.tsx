import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { getAptProfile } from "@/actions/apt";
import { getBondeeRoom } from "@/actions/apt-bondee";
import { DEFAULT_BONDEE_ROOM } from "@/lib/apt/bondee/types";
import { AptHubClient } from "@/components/apt/apt-hub-client";

export const metadata = {
  title: "APT | MoCoMo",
  description: "MoCoMo APT — Bondee 스타일 인형의 집 소셜 메타버스",
};

export const dynamic = "force-dynamic";

export default async function AptPage() {
  try {
    const user = await getCachedCurrentUser();
    const profile = user ? await getAptProfile() : null;

    if (user && profile && !profile.moveInCompleted) {
      redirect("/apt/move-in");
    }

    const bondeeRoom = user ? await getBondeeRoom() : DEFAULT_BONDEE_ROOM;

    return (
      <AptHubClient initialProfile={profile} bondeeRoom={bondeeRoom} isLoggedIn={!!user} />
    );
  } catch (e) {
    console.error("[AptPage]", e);
    return (
      <AptHubClient initialProfile={null} bondeeRoom={DEFAULT_BONDEE_ROOM} isLoggedIn={false} />
    );
  }
}
