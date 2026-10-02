"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import Link from "next/link";
import { completeAvatarOnboarding } from "@/actions/avatar-onboarding";
import { ProfileImageField } from "@/components/profile/profile-image-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrandWordmark } from "@/components/auth/auth-brand-wordmark";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/components/providers/locale-provider";

export function CompleteAvatarForm({ dest }: { dest?: string }) {
  const { locale, t } = useLocale();
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!image.trim()) {
      setError(
        "Please set a profile photo."
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await completeAvatarOnboarding({ image: image.trim(), dest });
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
    "Profile photo";
  const desc =
    `Upload a profile photo from your device to finish joining ${BRAND.name}.`;

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <AuthBrandWordmark className="mx-auto !text-foreground" />
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <ProfileImageField
              kind="avatar"
              name="image"
              value={image}
              onChange={setImage}
              uploadOnly
            />
            {error ? (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full rounded-xl" disabled={loading || !image.trim()}>
              {loading
                ? "Saving…"
                : "Continue"}
            </Button>
            <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
              {null}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
