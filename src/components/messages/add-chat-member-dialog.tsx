"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
        setError(result.error === "NOT_MEMBER" ? t("messages.slm6ssx") : result.error);
        return;
      }
      setList((prev) => (prev.some((m) => m.id === result.added.id) ? prev : [...prev, result.added]));
      setHandle("");
      setOkNote(t("messages.s1o3eebp", { v0: result.added.username }));
      router.refresh();
    } catch {
      setError(t("messages.sqtzbp8"));
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
          aria-label={t("messages.swzrnuw")}
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("messages.s1u7n3jg")}</DialogTitle>
          <DialogDescription>{t("messages.s6rt8ld")}</DialogDescription>
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
            placeholder={t("messages.s1tfd56k")}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={busy}
            aria-label={t("messages.sez7c54")}
          />
          <Button type="submit" disabled={busy || !handle.trim()} className="shrink-0">
            {busy ? "…" : t("messages.szwto")}
          </Button>
        </form>
        {okNote ? <p className="text-xs font-medium text-folk-cobalt">{okNote}</p> : null}
        {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
