import { UsedMarketChips } from "@/components/used/used-market-chips";

export const dynamic = "force-dynamic";

export default async function UsedHomePage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; lane?: string; category?: string; product?: string }>;
}) {
  const search = await searchParams;
  return (
    <UsedMarketChips
      track={search.track}
      lane={search.lane}
      category={search.category}
      product={search.product}
    />
  );
}
