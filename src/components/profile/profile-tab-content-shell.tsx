"use client";

import { useEffect, useState } from "react";
import type { ProfileTabContentMeta } from "@/actions/profile-page";
import { ProfileTabContent } from "@/components/profile/profile-tab-content";

/** 레거시 클라이언트 전용 진입 — 신규는 `/u/[username]/page` 서버 메타 사용 */
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
    return <div className="min-h-[12rem]" aria-busy="true" />;
  }

  return <ProfileTabContent username={username} meta={meta} />;
}
