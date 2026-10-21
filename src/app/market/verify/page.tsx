import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UsedVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const next = callbackUrl?.startsWith("/") ? callbackUrl : "/market";
  redirect(next);
}
