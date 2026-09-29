import { auth } from "@/lib/auth";
import { getDirectTradeView } from "@/lib/direct-trade/service";
import { UsedDirectTradePanel } from "@/components/used/used-direct-trade-panel";

export async function UsedDirectTradeChat({ roomId }: { roomId: string }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  try {
    const view = await getDirectTradeView(session.user.id, { roomId });
    if (!view) return null;
    return <UsedDirectTradePanel initial={view} />;
  } catch {
    return null;
  }
}
