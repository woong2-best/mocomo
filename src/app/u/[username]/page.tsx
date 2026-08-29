import { notFound } from "next/navigation";
import { getProfileTabContentMeta, getProfileTabInitialPayload } from "@/actions/profile-page";
import { ProfileTabContent } from "@/components/profile/profile-tab-content";

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; sort?: string; kind?: string }>;
}) {
  const { username } = await params;
  const sp = await searchParams;

  const [meta, initialPayload] = await Promise.all([
    getProfileTabContentMeta(username),
    getProfileTabInitialPayload(username, sp.tab, sp.sort, sp.kind),
  ]);
  if (!meta) notFound();

  return (
    <ProfileTabContent username={username} meta={meta} initialPayload={initialPayload} />
  );
}
