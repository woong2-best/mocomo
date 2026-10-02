"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCommunity, updateCommunity } from "@/actions/community-hub";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ProfileImageField } from "@/components/profile/profile-image-field";
import { ProfileBannerField } from "@/components/profile/profile-banner-field";

export function CommunityBrandingSettings({
  communityId,
  slug,
  initial,
}: {
  communityId: string;
  slug: string;
  initial: {
    iconUrl: string | null;
    coverUrl: string | null;
    bannerUrl: string | null;
    bannerVideoUrl: string | null;
    isPublic: boolean;
  };
}) {
  const router = useRouter();
  const [iconUrl, setIconUrl] = useState(initial.iconUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl ?? "");
  const [bannerVideoUrl, setBannerVideoUrl] = useState(initial.bannerVideoUrl ?? "");
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function save() {
    setLoading(true);
    setError("");
    const res = await updateCommunity(communityId, {
      iconUrl: iconUrl || undefined,
      coverUrl: coverUrl || undefined,
      bannerUrl: bannerVideoUrl ? undefined : bannerUrl || undefined,
      bannerVideoUrl: bannerVideoUrl || undefined,
      isPublic,
    });
    if ("error" in res && res.error) setError(errorText(res.error));
    else {
      setOk(t("profile.s12la3bm"));
      router.refresh();
    }
    setLoading(false);
  }

  async function removeCommunity() {
    const typed = prompt(t("community-server.sl9fj3l"));
    if (typed !== slug) return;
    if (!confirm(t("community-server.sogxsse"))) return;
    setDeleteLoading(true);
    const res = await deleteCommunity(communityId);
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      setDeleteLoading(false);
      return;
    }
    router.push("/communities");
  }

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <h2 className="font-semibold">{t("community-server.s63mwvd")}</h2>

      <ProfileImageField
        kind="avatar"
        name="iconUrl"
        value={iconUrl}
        onChange={setIconUrl}
        previewClassName="rounded-xl"
      />

      <ProfileImageField
        kind="cover"
        name="coverUrl"
        value={coverUrl}
        onChange={setCoverUrl}
        previewClassName="rounded-xl"
      />
      <p className="text-xs text-muted-foreground -mt-2">
        {t("community-server.s1a9gu4f")}
      </p>

      <ProfileBannerField
        bannerUrl={bannerUrl}
        bannerVideoUrl={bannerVideoUrl}
        onBannerUrlChange={setBannerUrl}
        onBannerVideoUrlChange={setBannerVideoUrl}
      />
      <p className="text-xs text-muted-foreground -mt-2">
        {t("community-server.s7vxts6")}
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        {t("community-server.s540kat")}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={loading} onClick={() => void save()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("settings.save")}
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={deleteLoading} onClick={() => void removeCommunity()}>
          {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("lib.community-server.s1k39ozr")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {ok && <p className="text-sm text-emerald-600">{ok}</p>}
    </section>
  );
}
