import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureStudioCreatorProfile } from "@/studio/actions/creator";
import { getStudioWalletSummary } from "@/studio/actions/wallet";
import { StudioSettingsForm } from "@/studio/components/studio-settings-form";

export default async function StudioSettingsPage() {
  await requireAuth();
  const profile = await ensureStudioCreatorProfile();
  const summary = await getStudioWalletSummary();
  const publishedAssets = await db.studioAsset.findMany({
    where: { creatorId: profile.userId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <StudioSettingsForm
      profile={profile}
      bankAccount={summary.bankAccount}
      publishedAssets={publishedAssets}
    />
  );
}
