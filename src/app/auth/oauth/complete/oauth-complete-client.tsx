"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Waits for client session hydration after OAuth signup redirect. */
export function OAuthCompleteClient({
  dest,
  signupUrl,
}: {
  dest: string;
  signupUrl: string;
}) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    router.replace(status === "authenticated" ? dest : signupUrl);
  }, [status, dest, signupUrl, router]);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
          </div>
          <CardTitle className="text-xl font-semibold">잠시만 기다려 주세요</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          계정을 확인하는 중입니다…
        </CardContent>
      </Card>
    </div>
  );
}
