import Link from "next/link";
import { MarketPageTitle } from "@/components/market/market-page-chrome";
import { MarketplaceSellerApplyForm } from "@/components/market/marketplace-seller-apply-form";
import {
  getMarketplaceSellerProfile,
  listMyMarketplaceListings,
  markMarketplaceConnectComplete,
} from "@/actions/marketplace";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listingTypeLabel } from "@/lib/marketplace/constants";
import { stripeConnectStatus } from "@/lib/stripe-connect";

export const dynamic = "force-dynamic";

export default async function MarketSellerPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/market/seller");
  }

  const connectParam = (await searchParams).connect;
  if (connectParam === "return") {
    await markMarketplaceConnectComplete().catch(() => null);
  }

  const [profile, listings] = await Promise.all([
    getMarketplaceSellerProfile(),
    listMyMarketplaceListings().catch(() => []),
  ]);

  if (!profile) {
    redirect("/market/seller/register");
  }

  if (!profile.onboardingCompletedAt && profile.onboardingStep !== "COMPLETE") {
    redirect("/market/seller/register");
  }

  const connectStatus = stripeConnectStatus(profile.user.stripeConnectAccountId);

  return (
    <>
      <MarketPageTitle>
        <div className="space-y-1 mb-4">
          <h1 className="text-2xl font-bold">판매자센터</h1>
          <p className="text-sm text-muted-foreground">
            판매자 프로필 · Stripe Connect 정산 · 내 상품
          </p>
        </div>
      </MarketPageTitle>

      <section className="rounded-2xl border border-border/60 p-4 space-y-2 mb-6">
        <p className="font-semibold">{profile.displayName}</p>
        <p className="text-xs text-muted-foreground">
          상태 {profile.status}
          {profile.sellerType
            ? ` · ${profile.sellerType === "BUSINESS" ? "사업자" : "개인"}`
            : ""}
          {" · "}판매 {profile.salesCount}
          {" · "}평점 {profile.ratingAvg > 0 ? profile.ratingAvg.toFixed(1) : "-"}
        </p>
        {profile.bio && <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>}
        <p className="text-xs text-muted-foreground">{connectStatus.message}</p>
        {profile.user.stripeConnectOnboardedAt && (
          <p className="text-xs text-emerald-600">
            Connect 연결 완료 ·{" "}
            {profile.user.stripeConnectOnboardedAt.toISOString().slice(0, 10)}
          </p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3">프로필 수정 · 정산 연결</h2>
        <MarketplaceSellerApplyForm
          initialName={
            profile.displayName ?? session.user.name ?? session.user.username ?? ""
          }
          connectReady={connectStatus.ready}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">내 상품</h2>
          <Link href="/market/sell-item" className="text-sm text-primary hover:underline">
            + 상품 등록
          </Link>
        </div>
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 상품이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center gap-3 p-3">
                {l.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.coverUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/market/i/${l.id}`}
                    className="font-medium text-sm hover:underline truncate block"
                  >
                    {l.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {listingTypeLabel(l.type)} · {l.status} · {l.priceAmount.toLocaleString()}원 ·
                    재고 {l.stock}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
