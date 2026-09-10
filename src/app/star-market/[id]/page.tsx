import { redirect } from "next/navigation";

/** 예전 /market/[id] 링크 → 디지털 상품 또는 이모티콘 slug */
export default async function MarketLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/market/digital/${id}`);
}
