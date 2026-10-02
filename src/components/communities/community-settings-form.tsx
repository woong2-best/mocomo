"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCommunity } from "@/actions/community-hub";
import { COMMUNITY_CATEGORY_OPTIONS } from "@/lib/community-labels";
import type { CommunityCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export function CommunitySettingsForm({
  communityId,
  slug,
  initial,
}: {
  communityId: string;
  slug: string;
  initial: {
    name: string;
    description: string | null;
    category: CommunityCategory;
    customCategoryLabel: string | null;
    isNsfw: boolean;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [category, setCategory] = useState<CommunityCategory>(initial.category);
  const [customCategoryLabel, setCustomCategoryLabel] = useState(
    initial.customCategoryLabel ?? ""
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const result = await updateCommunity(communityId, {
        name: form.get("name") as string,
        description: (form.get("description") as string) || "",
        category,
        customCategoryLabel: category === "CUSTOM" ? customCategoryLabel : undefined,
        isNsfw: form.get("isNsfw") === "on",
      });
      if (!result) {
        setError(t("communities.s10pm8gr"));
        return;
      }
      if ("error" in result && result.error) {
        setError(errorText(result.error));
        return;
      }
      setOk(t("profile.s12la3bm"));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.sog10vg"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">
        {t("communities.sucpii")} <span className="text-foreground font-mono">/c/{slug}</span>
      </p>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t("market.name")}</label>
        <Input name="name" defaultValue={initial.name} required minLength={2} maxLength={80} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t("community-server.sxvj5")}</label>
        <textarea
          name="description"
          defaultValue={initial.description ?? ""}
          className="w-full min-h-[120px] rounded-lg border border-border bg-background p-3 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{t("games.categories")}</label>
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as CommunityCategory)}
          className="w-full h-10 rounded-sm border border-border px-3 text-sm"
          required
        >
          {COMMUNITY_CATEGORY_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
          <option value="CUSTOM">{t("communities.s1280jvp")}</option>
        </select>
        {category === "CUSTOM" && (
          <Input
            value={customCategoryLabel}
            onChange={(e) => setCustomCategoryLabel(e.target.value)}
            placeholder={t("communities.2_24")}
            maxLength={24}
            required
          />
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isNsfw" defaultChecked={initial.isNsfw} />
        {t("communities.nsfw")}
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {ok && <p className="text-sm text-green-600 dark:text-green-400">{ok}</p>}
      <Button type="submit" disabled={loading} className="w-full rounded-xl">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("settings.save")}
      </Button>
    </form>
  );
}
