import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { ensureStudioCreatorProfile } from "@/studio/actions/creator";
import { AssetCreateForm } from "@/studio/components/asset-create-form";

export default async function StudioCreatePage() {
  await requireAuth();
  await ensureStudioCreatorProfile();

  return <AssetCreateForm />;
}
