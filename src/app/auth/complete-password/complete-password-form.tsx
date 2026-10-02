"use client";


import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { completeSignupPasswordOnboarding } from "@/actions/signup-identity-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrandWordmark } from "@/components/auth/auth-brand-wordmark";
import { useLocale } from "@/components/providers/locale-provider";

export function CompletePasswordForm({ dest }: { dest?: string }) {
  const { locale } = useLocale();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await completeSignupPasswordOnboarding({ password, dest });
      if (result?.error) setError(errorText(result.error));
    } catch {
      setError(
        "Could not save. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const title = "Set a password";
  const desc =
    "Create a password for signing in with your username.";

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-[#0f1a33] min-h-[60vh]">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <AuthBrandWordmark className="mx-auto !text-foreground" />
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {"Password"} *
              </span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {"Confirm password"} *
              </span>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="rounded-xl"
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "…" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
