"use client";


import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { completeSignupProfileOnboarding } from "@/actions/signup-identity-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrandWordmark } from "@/components/auth/auth-brand-wordmark";
import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  dest?: string;
  initialUsername: string;
  initialName: string;
};

export function CompleteProfileForm({ dest, initialUsername, initialName }: Props) {
  const { locale } = useLocale();
  const [username, setUsername] = useState(initialUsername);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await completeSignupProfileOnboarding({
        username: username.trim().toLowerCase(),
        name: name.trim(),
        dest,
      });
      if (result?.error) setError(errorText(result.error));
    } catch {
      setError(
        "Could not save. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const title =
    "Username & nickname";
  const desc =
    "Choose your username and display name.";

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
                {"Username"} *
              </span>
              <Input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))
                }
                placeholder="mocomo_user"
                autoComplete="username"
                className="rounded-xl"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                {"3–20 letters, numbers, underscore"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {"Nickname"} *
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                placeholder={"Display name"}
                autoComplete="nickname"
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
