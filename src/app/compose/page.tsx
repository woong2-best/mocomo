import { Suspense } from "react";
import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ComposeRedirectClient } from "./compose-redirect-client";

export default async function ComposePage() {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/compose");
  }

  return (
    <Suspense fallback={null}>
      <ComposeRedirectClient />
    </Suspense>
  );
}
