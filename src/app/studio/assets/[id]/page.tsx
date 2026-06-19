import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getStudioAsset } from "@/studio/actions/assets";
import { AssetEditor } from "@/studio/components/asset-editor";

export default async function StudioAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const asset = await getStudioAsset(id);
  if (!asset) notFound();

  const canEdit = session?.user?.id === asset.creatorId;

  return <AssetEditor asset={asset} canEdit={canEdit} />;
}
