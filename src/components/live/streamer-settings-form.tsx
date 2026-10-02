"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { useState, useTransition } from "react";
import { updateStreamerProfile } from "@/actions/streamer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StreamerSettingsForm({
  initial,
}: {
  initial: { bio: string; announcement: string; scheduleNote: string };
}) {
  const { t } = useLocale();
  const [bio, setBio] = useState(initial.bio);
  const [announcement, setAnnouncement] = useState(initial.announcement);
  const [scheduleNote, setScheduleNote] = useState(initial.scheduleNote);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateStreamerProfile({ bio, announcement, scheduleNote });
      setMsg(t("live.s12la3bm"));
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border p-4">
      <div>
        <label className="text-xs text-muted-foreground">{t("live.sxv68")}</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="rounded-xl mt-1 w-full min-h-[80px] border border-input bg-background px-3 py-2 text-sm"
          rows={3}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">
          {t("live.s1ssh8h7")}
        </label>
        <textarea
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          className="rounded-xl mt-1 w-full min-h-[80px] border border-input bg-background px-3 py-2 text-sm"
          rows={3}
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">
          {t("live.s1eoos7p")}
        </label>
        <Input value={scheduleNote} onChange={(e) => setScheduleNote(e.target.value)} className="rounded-xl mt-1" />
      </div>
      <Button className="w-full rounded-xl" onClick={save} disabled={pending}>
        {t("settings.save")}
      </Button>
      {msg && <p className="text-xs text-muted-foreground text-center">{msg}</p>}
    </div>
  );
}
