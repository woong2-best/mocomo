"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCommunity } from "@/actions/community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const categories = [
  "ANIME", "MANGA", "GAME", "VTUBER", "COSPLAY", "FIGURE", "ART",
  "MUSIC", "AI_ART", "LIGHT_NOVEL", "GOODS", "OTHER",
] as const;

export default function NewCommunityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await createCommunity({
      name: form.get("name") as string,
      description: form.get("description") as string,
      category: form.get("category") as (typeof categories)[number],
      isNsfw: form.get("isNsfw") === "on",
    });
    setLoading(false);
    if (result.community) router.push(`/c/${result.community.slug}`);
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>새 커뮤니티</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="name" placeholder="커뮤니티 이름" required />
            <textarea
              name="description"
              placeholder="설명"
              className="w-full min-h-[100px] rounded-lg border border-border bg-background/50 p-3 text-sm"
            />
            <select
              name="category"
              className="w-full h-10 rounded-lg border border-border bg-background/50 px-3 text-sm"
              required
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isNsfw" />
              NSFW 커뮤니티
            </label>
            <Button type="submit" className="w-full" disabled={loading}>
              생성
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
