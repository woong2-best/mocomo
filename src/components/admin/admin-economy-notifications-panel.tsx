"use client";

import { useState } from "react";
import {
  adminBroadcastEconomyNotice,
  adminSendEconomyNoticeToUser,
} from "@/actions/admin-economy-notifications";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Megaphone } from "lucide-react";

export function AdminEconomyNotificationsPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [username, setUsername] = useState("");
  const [target, setTarget] = useState<"economy_users" | "all">("economy_users");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onBroadcast() {
    setBusy(true);
    setResult(null);
    const res = await adminBroadcastEconomyNotice({
      title,
      body,
      href: href || undefined,
      target,
    });
    setResult(`${res.sent}명에게 발송`);
    setBusy(false);
  }

  async function onSendOne() {
    setBusy(true);
    setResult(null);
    const res = await adminSendEconomyNoticeToUser({
      username,
      title,
      body,
      href: href || undefined,
    });
    setResult("error" in res ? res.error : `@${username} 발송 완료`);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Economy Notification Push
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="본문" value={body} onChange={(e) => setBody(e.target.value)} />
          <Input
            placeholder="Deep link (선택) · /apt/house?shop=market"
            value={href}
            onChange={(e) => setHref(e.target.value)}
          />
          <div className="flex gap-2 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={target === "economy_users"}
                onChange={() => setTarget("economy_users")}
              />
              경제 유저 (Wallet 보유)
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={target === "all"} onChange={() => setTarget("all")} />
              전체 (최대 5000)
            </label>
          </div>
          <Button disabled={busy || !title.trim() || !body.trim()} onClick={() => void onBroadcast()}>
            공지 발송
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">개별 발송</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Button
            variant="outline"
            disabled={busy || !username.trim() || !title.trim()}
            onClick={() => void onSendOne()}
          >
            1명에게 발송
          </Button>
          {result ? <p className="text-sm text-muted-foreground">{result}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
