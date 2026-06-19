"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStudioCreatorProfile } from "@/studio/actions/creator";
import type { StudioCreatorProfile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function StudioSettingsForm({ profile }: { profile: StudioCreatorProfile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="mx-auto max-w-lg space-y-4 rounded-2xl border border-pink-100 bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await updateStudioCreatorProfile({
            displayName: String(fd.get("displayName") ?? ""),
            bio: String(fd.get("bio") ?? ""),
          });
          if (r.success) {
            setMsg("저장되었습니다.");
            router.refresh();
          }
        });
      }}
    >
      <h1 className="font-display text-2xl font-semibold">크리에이터 설정</h1>
      <p className="text-sm text-muted-foreground">핸들: @{profile.handle}</p>

      <div>
        <label className="mb-1 block text-sm font-medium">표시 이름</label>
        <Input name="displayName" defaultValue={profile.displayName} required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">소개</label>
        <Textarea name="bio" rows={4} defaultValue={profile.bio ?? ""} />
      </div>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      <Button type="submit" disabled={pending}>
        저장
      </Button>
    </form>
  );
}
