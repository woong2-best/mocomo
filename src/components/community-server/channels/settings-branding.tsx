"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCommunity } from "@/actions/community-hub";
import { updateCommunity } from "@/actions/community-hub";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ProfileImageField } from "@/components/profile/profile-image-field";

export function CommunityBrandingSettings({
  communityId,
  slug,
  initial,
}: {
  communityId: string;
  slug: string;
  initial: {
    iconUrl: string | null;
    bannerUrl: string | null;
    isPublic: boolean;
  };
}) {
  const router = useRouter();
  const [iconUrl, setIconUrl] = useState(initial.iconUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl ?? "");
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
      bannerUrl: bannerUrl || undefined,
      isPublic,
    });
    if ("error" in res && res.error) setError(res.error);
    else {
      setOk("저장되었습니다.");
      router.refresh();
    }
    setLoading(false);
  }

  async function removeCommunity() {
    const typed = prompt('삭제하려면 커뮤니티 슬러그를 입력하세요:');
    if (typed !== slug) return;
    if (!confirm("정말 이 커뮤니티를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleteLoading(true);
    const res = await deleteCommunity(communityId);
    if ("error" in res && res.error) {
      setError(res.error);
      setDeleteLoading(false);
      return;
    }
    router.push("/communities");
  }

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <h2 className="font-semibold">브랜딩 & 공개 설정</h2>

      <ProfileImageField
        kind="avatar"
        name="iconUrl"
        value={iconUrl}
        onChange={setIconUrl}
        previewClassName="rounded-xl"
      />

      <ProfileImageField
        kind="banner"
        name="bannerUrl"
        value={bannerUrl}
        onChange={setBannerUrl}
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        공개 커뮤니티 (검색·목록에 표시, 비회원 읽기 전용 허용)
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={loading} onClick={() => void save()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={deleteLoading} onClick={() => void removeCommunity()}>
          {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "커뮤니티 삭제"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {ok && <p className="text-sm text-emerald-600">{ok}</p>}
    </section>
  );
}
