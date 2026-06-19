import { requireAuth } from "@/lib/auth";
import { ensureStudioCreatorProfile } from "@/studio/actions/creator";
import { StudioSettingsForm } from "@/studio/components/studio-settings-form";

export default async function StudioSettingsPage() {
  await requireAuth();
  const profile = await ensureStudioCreatorProfile();
  return <StudioSettingsForm profile={profile} />;
}
