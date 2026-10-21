import { redirect } from "next/navigation";
import { parseMarketLane } from "@/lib/market-browse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UsedMyPage({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string }>;
}) {
  const { lane } = await searchParams;
  const mapped =
    lane === "selling" ? "my" : parseMarketLane(lane) ?? (lane === "disputes" || lane === "my-bids" ? lane : "my");
  redirect(`/market?lane=${encodeURIComponent(mapped)}`);
}
