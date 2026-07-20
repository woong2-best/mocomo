"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminSaveSettingsAction } from "@/actions/admin-cms";
import type { SiteSettingsShape } from "@/lib/admin/services/settings";

export function AdminSettingsForm({ initial }: { initial: SiteSettingsShape }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  function set<K extends keyof SiteSettingsShape>(key: K, value: SiteSettingsShape[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border/70 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await adminSaveSettingsAction(form);
          setMsg(res.error ?? "저장되었습니다. 새로고침해도 유지됩니다.");
          if (!res.error && res.data) {
            setForm(res.data);
            router.refresh();
          }
        });
      }}
    >
      <label className="block space-y-1 text-sm">
        <span>사이트 이름</span>
        <Input value={form.siteName} onChange={(e) => set("siteName", e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>플랫폼 수수료 (%)</span>
        <Input
          type="number"
          value={form.platformFeePercent}
          onChange={(e) => set("platformFeePercent", Number(e.target.value))}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.registrationEnabled}
          onChange={(e) => set("registrationEnabled", e.target.checked)}
        />
        회원가입 허용
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.maintenanceMode}
          onChange={(e) => set("maintenanceMode", e.target.checked)}
        />
        점검 모드
      </label>
      <label className="block space-y-1 text-sm">
        <span>SMTP Host</span>
        <Input value={form.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span>SMTP Port</span>
        <Input
          type="number"
          value={form.smtpPort}
          onChange={(e) => set("smtpPort", Number(e.target.value))}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span>SMTP User</span>
        <Input value={form.smtpUser} onChange={(e) => set("smtpUser", e.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.oauthGoogleEnabled}
          onChange={(e) => set("oauthGoogleEnabled", e.target.checked)}
        />
        Google OAuth
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.oauthDiscordEnabled}
          onChange={(e) => set("oauthDiscordEnabled", e.target.checked)}
        />
        Discord OAuth
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.cloudflareTurnstileEnabled}
          onChange={(e) => set("cloudflareTurnstileEnabled", e.target.checked)}
        />
        Cloudflare Turnstile
      </label>
      <label className="block space-y-1 text-sm">
        <span>Storage</span>
        <Input
          value={form.storageProvider}
          onChange={(e) => set("storageProvider", e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.collaboratorsEnabled}
          onChange={(e) => set("collaboratorsEnabled", e.target.checked)}
        />
        게시물 공동작업자 기능
      </label>
      <label className="block space-y-1 text-sm">
        <span>공동작업자 최대 인원</span>
        <Input
          type="number"
          min={1}
          max={50}
          value={form.maxPostCollaborators}
          onChange={(e) => set("maxPostCollaborators", Number(e.target.value))}
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "저장 중…" : "설정 저장"}
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  );
}
