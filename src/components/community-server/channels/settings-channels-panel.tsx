"use client";

import { useEffect, useState } from "react";
import type { CommunityChannelType } from "@prisma/client";
import {
  getCommunityChannelsForManage,
  updateCommunityChannel,
  deleteCommunityChannel,
  createCommunityChannel,
  reorderCommunityChannels,
} from "@/actions/community-server";
import { Loader2, Pencil, Trash2, Lock, Unlock, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ChannelRow = {
  id: string;
  name: string;
  slug: string;
  type: CommunityChannelType;
  topic: string | null;
  position: number;
  isDefault: boolean;
  slowModeSec: number;
  isLocked: boolean;
  vipOnly: boolean;
  maxUsers: number | null;
  categoryId: string | null;
};

const CREATE_TYPES: { value: CommunityChannelType; label: string }[] = [
  { value: "TEXT", label: "텍스트" },
  { value: "ANNOUNCEMENT", label: "공지" },
  { value: "QA", label: "Q&A" },
  { value: "VOICE", label: "음성/영상" },
  { value: "GALLERY", label: "갤러리" },
  { value: "EVENT", label: "이벤트" },
];

export function CommunityChannelsPanel({
  communityId,
  communitySlug,
}: {
  communityId: string;
  communitySlug: string;
}) {
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<ChannelRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<CommunityChannelType>("TEXT");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await getCommunityChannelsForManage(communityId);
    setChannels(res.channels as ChannelRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [communityId]);

  async function moveChannel(id: string, dir: -1 | 1) {
    const idx = channels.findIndex((c) => c.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= channels.length) return;
    const ordered = [...channels];
    const [item] = ordered.splice(idx, 1);
    ordered.splice(next, 0, item);
    setChannels(ordered);
    const res = await reorderCommunityChannels(
      communityId,
      ordered.map((c) => c.id)
    );
    if ("error" in res && res.error) setError(res.error);
  }

  async function saveEdit() {
    if (!edit) return;
    setSaving(true);
    setError("");
    const res = await updateCommunityChannel(edit.id, {
      name: edit.name,
      topic: edit.topic ?? "",
      slowModeSec: edit.slowModeSec,
      isLocked: edit.isLocked,
      vipOnly: edit.vipOnly,
      maxUsers: edit.maxUsers,
    });
    if ("error" in res && res.error) setError(res.error);
    else {
      setEdit(null);
      await load();
      if ("slug" in res && res.slug && res.slug !== edit.slug) {
        window.location.href = `/c/${communitySlug}/${res.slug}`;
      }
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("이 채널을 삭제할까요?")) return;
    const res = await deleteCommunityChannel(id);
    if ("error" in res && res.error) setError(res.error);
    else await load();
  }

  async function create() {
    setSaving(true);
    setError("");
    const res = await createCommunityChannel({ communityId, type: newType, name: newName });
    if ("error" in res && res.error) setError(res.error);
    else {
      setCreateOpen(false);
      setNewName("");
      await load();
    }
    setSaving(false);
  }

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">채널 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">
            채널 생성·이름 변경·슬로우 모드·잠금·삭제
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          채널 추가
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          불러오는 중…
        </div>
      ) : (
        <ul className="space-y-2">
          {channels.map((ch) => (
            <li
              key={ch.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {ch.name}
                  {ch.isLocked && (
                    <Lock className="inline h-3.5 w-3.5 ml-1 text-amber-600" />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ch.type}
                  {ch.slowModeSec > 0 ? ` · 슬로우 ${ch.slowModeSec}초` : ""}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button type="button" size="icon" variant="ghost" onClick={() => void moveChannel(ch.id, -1)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => void moveChannel(ch.id, 1)}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => setEdit({ ...ch })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {!ch.isDefault && !["POSTS", "MEMBERS", "SETTINGS"].includes(ch.type) && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => void remove(ch.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>채널 설정</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <label className="block text-sm">
                이름
                <Input
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                주제
                <Input
                  value={edit.topic ?? ""}
                  onChange={(e) => setEdit({ ...edit, topic: e.target.value })}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                슬로우 모드 (초)
                <Input
                  type="number"
                  min={0}
                  max={21600}
                  value={edit.slowModeSec}
                  onChange={(e) =>
                    setEdit({ ...edit, slowModeSec: parseInt(e.target.value, 10) || 0 })
                  }
                  className="mt-1"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={edit.vipOnly}
                  onChange={(e) => setEdit({ ...edit, vipOnly: e.target.checked })}
                />
                VIP 전용 채널
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={edit.isLocked}
                  onChange={(e) => setEdit({ ...edit, isLocked: e.target.checked })}
                />
                {edit.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                채널 잠금 (관리자만 채팅)
              </label>
              <Button type="button" disabled={saving} onClick={() => void saveEdit()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>채널 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm">
              이름
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm">
              유형
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newType}
                onChange={(e) => setNewType(e.target.value as CommunityChannelType)}
              >
                {CREATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" disabled={saving || !newName.trim()} onClick={() => void create()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "생성"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
