import { notFound } from "next/navigation";
import { getProfileTabContentMeta } from "@/actions/profile-page";
import { ProfileTabContent } from "@/components/profile/profile-tab-content";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const meta = await getProfileTabContentMeta(username);
  if (!meta) notFound();

  return <ProfileTabContent username={username} meta={meta} />;
}
