import { CompleteAvatarForm } from "./complete-avatar-form";

export const dynamic = "force-dynamic";

export default async function CompleteAvatarPage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const sp = await searchParams;
  return <CompleteAvatarForm dest={sp.dest} />;
}
