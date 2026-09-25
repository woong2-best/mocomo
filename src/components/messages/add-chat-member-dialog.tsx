"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { addChatMemberByHandle } from "@/actions/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type ChatMemberPreview = {
  id: string;
  username: string;
  name?: string | null;
  image: string | null;
  timeZone?: string | null;
};

export function AddChatMemberDialog({
  roomId,
  members,
}: {
  roomId: string;
  members: ChatMemberPreview[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okNote, setOkNote] = useState("");
  const [list, setList] = useState(members);

  useEffect(() => {
    setList(members);
  }, [members]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const next = handle.trim();
    if (!next || busy) return;
    setBusy(true);
    setError("");
    setOkNote("");
    try {
      const result = await addChatMemberByHandle(roomId, next);
      if ("error" in result) {
        setError(result.error === "NOT_MEMBER" ? "대화 멤버만 추가할 수 있습니다." : result.error);
        return;
      }
      setList((prev) => (prev.some((m) => m.id === result.added.id) ? prev : [...prev, result.added]));
      setHandle("");
      setOkNote(`@${result.added.username} 님을 추가했습니다.`);
      router.refresh();
    } catch {
      setError("추가하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setHandle("");
          setError("");
          setOkNote("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          aria-label="대화에 사람 추가"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>사람 추가</DialogTitle>
          <DialogDescription>아이디를 한 명씩 입력해 이 대화에 추가합니다.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-40 overflow-y-auto space-y-2">
          {list.map((m) => {
            const label = m.name?.trim() || m.username;
            return (
              <li key={m.id} className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={m.image ?? undefined} />
                  <AvatarFallback className="text-xs">{label[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{label}</p>
                  <p className="text-xs text-muted-foreground truncate">@{m.username}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <form onSubmit={onAdd} className="flex gap-2">
          <Input
            className="flex-1"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="아이디 입력"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={busy}
            aria-label="추가할 아이디"
          />
          <Button type="submit" disabled={busy || !handle.trim()} className="shrink-0">
            {busy ? "…" : "추가"}
          </Button>
        </form>
        {okNote ? <p className="text-xs font-medium text-folk-cobalt">{okNote}</p> : null}
        {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
