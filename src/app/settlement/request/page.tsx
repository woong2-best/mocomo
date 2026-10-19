import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SettlementRequestFlow } from "@/components/settlement/settlement-request-flow";

export const dynamic = "force-dynamic";

export default async function SettlementRequestPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/settlement/request");
  }

  return <SettlementRequestFlow />;
}
