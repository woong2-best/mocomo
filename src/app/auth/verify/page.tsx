"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function VerifyInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    if (!token || !email) {
      setStatus("error");
      setError(t("auth.st9b7nw"));
      return;
    }

    verifyEmail({ token, email })
      .then((result) => {
        if (result.error) {
          setStatus("error");
          setError(errorText(result.error));
        } else {
          setStatus("ok");
        }
      })
      .catch(() => {
        setStatus("error");
        setError(t("auth.s1vqicls"));
      });
  }, [searchParams]);

  return (
    <Card className="w-full max-w-md rounded-2xl">
      <CardHeader className="text-center">
        <CardTitle>
          {status === "loading" && t("auth.stah33")}
          {status === "ok" && t("auth.emailVerifyDone")}
          {status === "error" && t("auth.so18mn3")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center text-sm">
        {status === "loading" && <p className="text-muted-foreground">{t("auth.s1hzbod2")}</p>}
        {status === "ok" && (
          <>
            <p className="text-muted-foreground">{t("auth.stcywbd")}</p>
            <Button asChild className="w-full rounded-xl">
              <Link href="/auth/signin">{t("auth.loginAction")}</Link>
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-destructive">{error}</p>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/auth/email-verify">{t("auth.s1r6f9ul")}</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md rounded-2xl">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {t("auth.stah33")}
            </CardContent>
          </Card>
        }
      >
        <VerifyInner />
      </Suspense>
    </div>
  );
}
