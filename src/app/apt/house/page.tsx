import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { getAptProfile } from "@/actions/apt";
import { AptHouseHubClient } from "@/components/apt/apt-house-hub-client";

export const metadata = {
  title: "주택 | MoCoMo APT",
  description: "전 세계 부지에서 주택 건설",
};

export const dynamic = "force-dynamic";

export default async function AptHousePage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/apt/house");

  const profile = await getAptProfile();
  if (!profile || profile.housingType !== "house") redirect("/apt");

  return <AptHouseHubClient initialProfile={profile} />;
}
