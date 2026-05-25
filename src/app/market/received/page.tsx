import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getReceivedEmoticonGifts } from "@/actions/goods-shop";

export default async function ReceivedEmoticonsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/market/received");

  const gifts = await getReceivedEmoticonGifts().catch(() => []);

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">시청자가 보낸 MoCoMo 이모티콘 선물 · 90% 정산</p>
      {gifts.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground text-sm">받은 이모티콘이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {gifts.map((g) => (
            <li key={g.id} className="flex gap-3 rounded-2xl border border-border/60 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.pack.previewUrl} alt="" className="h-14 w-14 rounded-xl object-contain bg-muted/30 p-1" />
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
