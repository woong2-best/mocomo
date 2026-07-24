"use client";

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
    isNsfw: boolean;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

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
        category: form.get("category") as string,
        isNsfw: form.get("isNsfw") === "on",
      });
      if (!result) {
        setError("서버 응답이 없습니다.");
        return;
      }
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setOk("저장되었습니다.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">
        주소: <span className="text-foreground font-mono">/c/{slug}</span>
      </p>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">이름</label>
        <Input name="name" defaultValue={initial.name} required minLength={2} maxLength={80} />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">설명</label>
        <textarea
          name="description"
          defaultValue={initial.description ?? ""}
          className="w-full min-h-[120px] rounded-lg border border-border bg-background p-3 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">카테고리</label>
        <select
          name="category"
          defaultValue={initial.category}
          className="w-full h-10 rounded-sm border border-border px-3 text-sm"
          required
        >
          {COMMUNITY_CATEGORY_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isNsfw" defaultChecked={initial.isNsfw} />
        NSFW 커뮤니티
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {ok && <p className="text-sm text-green-600 dark:text-green-400">{ok}</p>}
      <Button type="submit" disabled={loading} className="w-full rounded-xl">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
      </Button>
    </form>
  );
}
