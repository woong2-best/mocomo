import { requireAuth } from "@/lib/auth";
import { getStudioWalletSummary } from "@/studio/actions/wallet";
import { StudioWalletPanel } from "@/studio/components/studio-wallet-panel";

export default async function StudioWalletPage() {
  await requireAuth();
  const summary = await getStudioWalletSummary();
  return <StudioWalletPanel summary={summary} />;
}
