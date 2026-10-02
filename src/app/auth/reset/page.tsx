"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { resetPasswordConfirm } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !email) return;
    setLoading(true);
    setError("");
    const result = await resetPasswordConfirm({ email, token, password });
    setLoading(false);
    if (result.error) {
      setError(errorText(result.error));
      return;
    }
    router.push("/auth/signin?reset=1");
  }

  if (!token || !email) {
    return (
      <Card className="max-w-md mx-auto glass">
        <CardContent className="p-6 text-center text-muted-foreground">
          {t("auth.s1pm7pki")}
          <Link href="/auth/forgot-password" className="block mt-4 text-primary">
            {t("auth.sdr53r5")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto glass">
      <CardHeader>
        <CardTitle>{t("auth.smzl9hg")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder={t("auth.newPasswordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.s1qjjytc") : t("auth.changePassword")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense fallback={<p className="text-muted-foreground">{t("auth.sxdr6kh")}</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
