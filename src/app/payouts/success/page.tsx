import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncUserExpressConnectFromStripe } from "@/lib/settlement-express-connect";

export default async function PayoutsSuccessPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/payouts/success");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });

  if (user?.stripeConnectAccountId) {
    try {
      await syncUserExpressConnectFromStripe(session.user.id, user.stripeConnectAccountId);
    } catch (e) {
      console.error("[payouts/success] sync failed", e);
    }
  }

  redirect("/wallet?tab=earnings&connect=success");
}
