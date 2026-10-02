"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, Plus } from "lucide-react";
import { createCommunityEvent } from "@/actions/community-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EventRow = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  imageUrl: string | null;
};

export function EventsChannelPanel({
  communityId,
  communitySlug,
  canManage,
  initialEvents,
}: {
  communityId: string;
  communitySlug: string;
  canManage: boolean;
  initialEvents: EventRow[];
}) {
  const router = useRouter();
  const [events] = useState(initialEvents);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    const res = await createCommunityEvent(communityId, {
      title,
      description,
      startsAt,
      endsAt,
    });
    if ("error" in res && res.error) {
      setError(errorText(res.error));
      setLoading(false);
      return;
    }
    setOpen(false);
    setTitle("");
    setDescription("");
    setStartsAt("");
    setEndsAt("");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between gap-2">
        <h1 className="font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t("lib.payment.history.sbff20dc3bb")}
        </h1>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" />
            {open ? t("common.close") : t("community-server.sw2oj9c")}
          </Button>
        )}
      </header>

      {open && canManage && (
        <div className="shrink-0 border-b border-border/50 p-4 space-y-3 bg-muted/20">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("events.s7ws085")} />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("community-server.sxvj5")}
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              {t("explore.start")}
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1" />
            </label>
            <label className="text-xs text-muted-foreground">
              {t("lib.subculture.event.phase.scafdc61bbf")}
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-1" />
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button size="sm" disabled={loading} onClick={() => void submit()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("events.svsek")}
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            {t("community-server.s126co51")}
          </div>
        ) : (
          events.map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="block rounded-xl border border-border p-4 hover:bg-muted/40 transition-colors"
            >
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(e.startsAt).toLocaleString()} — {new Date(e.endsAt).toLocaleString()}
              </p>
              {e.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{e.description}</p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
