import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { getUsedListing } from "@/actions/used-market";
import { UsedPostForm } from "@/components/used/used-post-form";
import { isUsedAdultVerified } from "@/lib/used-youth-protection";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function UsedEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCachedCurrentUser();
  if (!user) redirect(`/auth/signin?callbackUrl=/market/${id}/edit`);
  const { t } = await getServerTranslator();

  const data = await getUsedListing(id, user.id);
  if (!data?.listing || data.listing.sellerId !== user.id) notFound();

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href={`/market/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium"
      >
        <ChevronLeft className="h-4 w-4" />
        {MARKET_BRAND_NAME}
      </Link>
      <h1 className="text-xl font-extrabold">{t("ui.edit_listing")}</h1>
      <UsedPostForm
        sellerAdultVerified={isUsedAdultVerified(user)}
        sellerCountryCode={user.countryCode}
        editListing={{
          id: data.listing.id,
          title: data.listing.title,
          description: data.listing.description,
          price: data.listing.price,
          currency: data.listing.currency,
          category: data.listing.category,
          productType: data.listing.productType,
          workTitle: data.listing.workTitle,
          animeSlug: data.listing.animeSlug,
          conditionGrade: data.listing.conditionGrade,
          tradeMode: data.listing.tradeMode,
          region: data.listing.region,
          meetPlace: data.listing.meetPlace,
          meetLat: data.listing.meetLat,
          meetLng: data.listing.meetLng,
          images: data.listing.images,
          isNsfw: data.listing.isNsfw,
        }}
      />
    </AppPageChrome>
  );
}
