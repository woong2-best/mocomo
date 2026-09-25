import { redirect } from "next/navigation";
import { readWebOAuthPendingSignup } from "@/lib/web-oauth-pending-signup";
import { CompleteOAuthSignupForm } from "./complete-oauth-signup-form";

export const dynamic = "force-dynamic";

function safeDest(raw: string | undefined): string | undefined {
  const path = raw?.trim() ?? "";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return undefined;
}

export default async function CompleteOAuthSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ dest?: string }>;
}) {
  const ticket = await readWebOAuthPendingSignup();
  if (!ticket) {
    redirect("/auth/signin?intent=signup&reason=oauth_failed");
  }

  const sp = await searchParams;
  return (
    <CompleteOAuthSignupForm
      dest={safeDest(sp.dest)}
      account={{
        email: ticket.profile.email,
        name: ticket.profile.name,
        image: ticket.profile.image,
      }}
    />
  );
}
