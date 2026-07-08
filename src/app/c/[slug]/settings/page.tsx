import { redirect } from "next/navigation";

export default async function CommunitySettingsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/c/${slug}/settings`);
}
