import { ProfileTabContentShell } from "@/components/profile/profile-tab-content-shell";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <ProfileTabContentShell username={username} />;
}
