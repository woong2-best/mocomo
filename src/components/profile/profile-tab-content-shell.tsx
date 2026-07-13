"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  ProfileTabContent,
  type ProfileTabContentMeta,
} from "@/components/profile/profile-tab-content";

export function ProfileTabContentShell({ username }: { username: string }) {
  const [meta, setMeta] = useState<ProfileTabContentMeta | null>(null);
  const [metaError, setMetaError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/profile/${username}/meta`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "프로필을 불러올 수 없습니다.");
        if (!cancelled) setMeta(json as ProfileTabContentMeta);
      })
      .catch((err: Error) => {
        if (!cancelled) setMetaError(err.message || "프로필을 불러올 수 없습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (metaError) {
    return <p className="py-12 text-center text-sm text-destructive">{metaError}</p>;
  }

  if (!meta) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        불러오는 중…
      </div>
    );
  }

  return <ProfileTabContent username={username} meta={meta} />;
}
