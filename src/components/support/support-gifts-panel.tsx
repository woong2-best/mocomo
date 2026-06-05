import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getReceivedEmoticonGifts } from "@/actions/goods-shop";
import { EmoticonPreview } from "@/components/market/emoticon-preview";

export async function SupportGiftsPanel() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/support?tab=gifts");

  const gifts = await getReceivedEmoticonGifts().catch(() => []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        팬이 후원 이모티콘으로 보낸 선물입니다. 정산은 지갑에서 확인할 수 있습니다.
      </p>
      {gifts.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground text-sm">
          받은 이모티콘 선물이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {gifts.map((g) => (
            <li key={g.id} className="flex gap-3 rounded-2xl border border-border/60 p-4">
              <EmoticonPreview
                name={g.pack.name}
                price={g.pack.price}
                previewUrl={g.pack.previewUrl}
                size="sm"
                className="rounded-xl"
              />
              <div>
                <p className="font-semibold">{g.pack.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  @{g.sender.username} · +{g.creatorAmount.toLocaleString()}원
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
