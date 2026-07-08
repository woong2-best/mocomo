"use client";

import { useState } from "react";
import type { CommunityChannelType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { createCommunityChannel } from "@/actions/community-server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

const TYPES: { value: CommunityChannelType; label: string }[] = [
  { value: "TEXT", label: "텍스트" },
  { value: "ANNOUNCEMENT", label: "공지" },
  { value: "VOICE", label: "음성/영상" },
];

export function ChannelCreateDialog({
  communityId,
  communitySlug,
  open,
  onOpenChange,
}: {
  communityId: string;
  communitySlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<CommunityChannelType>("TEXT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    const res = await createCommunityChannel({ communityId, type, name });
    if ("error" in res && res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    onOpenChange(false);
    setName("");
    if (res.channel?.slug) router.push(`/c/${communitySlug}/${res.channel.slug}`);
    else router.refresh();
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>채널 만들기</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="채널 이름" value={name} onChange={(e) => setName(e.target.value)} />
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as CommunityChannelType)}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" disabled={loading || !name.trim()} onClick={() => void submit()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "생성"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
