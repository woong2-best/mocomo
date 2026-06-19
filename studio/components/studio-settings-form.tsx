"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StudioAsset, StudioBankAccount, StudioCreatorProfile } from "@prisma/client";
import { updateStudioCreatorProfile } from "@/studio/actions/creator";
import { saveStudioBankAccount } from "@/studio/actions/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function StudioSettingsForm({
  profile,
  bankAccount,
  publishedAssets,
}: {
  profile: StudioCreatorProfile;
  bankAccount: StudioBankAccount | null;
  publishedAssets: StudioAsset[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl ?? "");

  async function uploadBanner(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("category", "image");
    const res = await fetch("/api/upload/local", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "배너 업로드 실패");
      return;
    }
    setBannerUrl(data.publicUrl);
    startTransition(async () => {
      const r = await updateStudioCreatorProfile({ bannerUrl: data.publicUrl });
      if (r.success) {
        setMsg("배너 저장됨");
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <form
        className="space-y-4 rounded-2xl border border-pink-100 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const r = await updateStudioCreatorProfile({
              displayName: String(fd.get("displayName") ?? ""),
              bio: String(fd.get("bio") ?? ""),
              featuredAssetId: String(fd.get("featuredAssetId") ?? "") || null,
            });
            if (r.success) {
              setMsg("프로필 저장됨");
              router.refresh();
            }
          });
        }}
      >
        <h1 className="font-display text-2xl font-semibold">크리에이터 설정</h1>
        <p className="text-sm text-muted-foreground">핸들: @{profile.handle}</p>

        <div>
          <p className="mb-2 text-sm font-medium">프로필 배너</p>
          <div
            className="mb-2 h-24 rounded-xl border border-pink-100 bg-gradient-to-r from-pink-100 to-violet-100 bg-cover bg-center"
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
          />
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-pink-200 px-3 py-2 text-xs hover:bg-pink-50">
            배너 이미지 업로드
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadBanner(f);
              }}
            />
          </label>
        </div>

        <Input name="displayName" defaultValue={profile.displayName} required />
        <Textarea name="bio" rows={4} defaultValue={profile.bio ?? ""} />

        <div>
          <label className="mb-1 block text-sm font-medium">대표 작품</label>
          <select
            name="featuredAssetId"
            className="w-full rounded-md border px-3 py-2 text-sm"
            defaultValue={profile.featuredAssetId ?? ""}
          >
            <option value="">선택 안 함</option>
            {publishedAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={pending}>
          프로필 저장
        </Button>
      </form>

      <form
        className="space-y-4 rounded-2xl border border-pink-100 bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const r = await saveStudioBankAccount({
              bankName: String(fd.get("bankName") ?? ""),
              accountNumber: String(fd.get("accountNumber") ?? ""),
              holderName: String(fd.get("holderName") ?? ""),
            });
            if (r.error) setMsg(r.error);
            else {
              setMsg("정산 계좌 저장됨");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold">Studio 정산 계좌</h2>
        <p className="text-xs text-muted-foreground">MoCoMo 지갑과 별도 · Studio 수익 출금용</p>
        <Input name="bankName" defaultValue={bankAccount?.bankName ?? ""} placeholder="은행명" required />
        <Input name="accountNumber" defaultValue={bankAccount?.accountNumber ?? ""} placeholder="계좌번호" required />
        <Input name="holderName" defaultValue={bankAccount?.holderName ?? ""} placeholder="예금주" required />
        <Button type="submit" variant="outline" disabled={pending}>
          계좌 저장
        </Button>
      </form>

      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
    </div>
  );
}
