import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyEmoticonStorage } from "@/actions/goods-shop";
import { SendEmoticonForm } from "@/components/market/send-emoticon-form";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmoticonPreview } from "@/components/market/emoticon-preview";

export async function SupportStoragePanel() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/support?tab=storage");

  const items = await getMyEmoticonStorage().catch(() => []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        구매한 이모티콘이 보관됩니다. 후원하고 싶은 크리에이터 닉네임을 입력해 선물하세요.
      </p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">보유 이모티콘이 없습니다.</p>
          <Link
            href="/support?tab=emoticons"
            className="text-primary text-sm font-medium mt-2 inline-block"
          >
            이모티콘 구매하기 →
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-border/60 bg-card overflow-hidden"
            >
              <div className="flex gap-4 p-4">
                <EmoticonPreview
                  name={item.pack.name}
                  price={item.pack.price}
                  previewUrl={item.pack.previewUrl}
                  size="sm"
                  className="rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{item.pack.name}</p>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        item.status === "AVAILABLE"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.status === "AVAILABLE" ? "사용 가능" : "선물 완료"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.pricePaid.toLocaleString()}원 구매
                    {item.gift && ` · @${item.gift.receiver.username}에게 전송`}
                  </p>
                </div>
              </div>
              {item.status === "AVAILABLE" && (
                <div className="px-4 pb-4">
                  <SendEmoticonForm
                    itemId={item.id}
                    packName={item.pack.name}
                    pricePaid={item.pricePaid}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
