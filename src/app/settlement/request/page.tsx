import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { SettlementRequestFlow } from "@/components/settlement/settlement-request-flow";

export const dynamic = "force-dynamic";

export default async function SettlementRequestPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/settlement/request");
  }

  return (
    <AppPageChrome maxWidth="lg" spacing="none">
      <SettlementRequestFlow />
    </AppPageChrome>
  );
}
