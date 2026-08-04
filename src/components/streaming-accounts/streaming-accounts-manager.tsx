"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  connectStreamingAccountManual,
  connectStreamingAccountOAuth,
  disconnectStreamingAccountAction,
  verifyStreamingAccount,
} from "@/actions/streaming-accounts";
import type { StreamingAccountPublic } from "@/lib/streaming-accounts/types";
import { CONNECTABLE_STREAMING_PLATFORMS } from "@/lib/streaming-accounts/types";
import type { ConnectableStreamingPlatform } from "@/lib/streaming-accounts/types";
import { isOAuthStreamingPlatform } from "@/lib/streaming-accounts/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: "YouTube",
  TWITCH: "Twitch",
  CHZZK: "치지직",
  KICK: "Kick",
};

type Props = {
  initialAccounts: StreamingAccountPublic[];
  bannerError?: string | null;
  bannerConnected?: string | null;
};

export function StreamingAccountsManager({
  initialAccounts,
  bannerError,
  bannerConnected,
}: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("CHZZK");
  const [channelInput, setChannelInput] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [error, setError] = useState(bannerError ?? "");
  const [success, setSuccess] = useState(
    bannerConnected ? `${PLATFORM_LABELS[bannerConnected] ?? bannerConnected} 연결 완료` : ""
  );
  const [pending, startTransition] = useTransition();

  async function onOAuthConnect(platform: string) {
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await connectStreamingAccountOAuth(platform);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("url" in res && res.url) {
        window.location.href = res.url;
      }
    });
  }

  async function onManualConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await connectStreamingAccountManual(selectedPlatform, channelInput);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("verificationCode" in res) {
        setPendingCode(res.verificationCode);
        setSuccess("채널 설명에 아래 코드를 추가한 뒤 '소유권 확인'을 눌러 주세요.");
        window.location.reload();
      }
    });
  }

  async function onVerify(accountId: string) {
    setError("");
    startTransition(async () => {
      const res = await verifyStreamingAccount(accountId);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setSuccess("계정이 인증되었습니다.");
      window.location.reload();
    });
  }

  async function onDisconnect(accountId: string) {
    if (!confirm("이 스트리밍 계정 연결을 해제할까요?")) return;
    startTransition(async () => {
      const res = await disconnectStreamingAccountAction(accountId);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">연결된 계정</CardTitle>
          <p className="text-sm text-muted-foreground">
            후원을 받으려면 먼저 본인 소유의 스트리밍 계정을 인증해야 합니다. URL만 붙여넣는
            방식은 사용할 수 없습니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">연결된 계정이 없습니다.</p>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {PLATFORM_LABELS[acc.platform] ?? acc.platform}
                    </span>
                    {acc.verified ? (
                      <Badge variant="default">인증됨</Badge>
                    ) : acc.pendingVerification ? (
                      <Badge variant="secondary">검증 대기</Badge>
                    ) : acc.revokedAt ? (
                      <Badge variant="destructive">해제됨</Badge>
                    ) : (
                      <Badge variant="outline">미인증</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm">{acc.channelName}</p>
                  <a
                    href={acc.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    채널 보기
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {acc.pendingVerification && acc.verificationCode ? (
                    <p className="text-xs text-muted-foreground">
                      채널 설명에 추가:{" "}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono">
                        {acc.verificationCode}
                      </code>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {acc.pendingVerification ? (
                    <Button size="sm" disabled={pending} onClick={() => onVerify(acc.id)}>
                      소유권 확인
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => onDisconnect(acc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">계정 연결</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CONNECTABLE_STREAMING_PLATFORMS.map((p) => (
              <Button
                key={p}
                type="button"
                size="sm"
                variant={selectedPlatform === p ? "default" : "outline"}
                onClick={() => setSelectedPlatform(p)}
              >
                {PLATFORM_LABELS[p] ?? p}
              </Button>
            ))}
          </div>

          {isOAuthStreamingPlatform(selectedPlatform as ConnectableStreamingPlatform) ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {PLATFORM_LABELS[selectedPlatform]} OAuth로 로그인하여 채널 소유권을 확인합니다.
              </p>
              <Button disabled={pending} onClick={() => onOAuthConnect(selectedPlatform)}>
                {PLATFORM_LABELS[selectedPlatform]} 연결
              </Button>
            </div>
          ) : (
            <form onSubmit={onManualConnect} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                채널 URL을 입력하면 검증 코드가 발급됩니다. 채널 설명(프로필)에 코드를 넣고
                소유권 확인을 진행하세요.
              </p>
              <Input
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="https://chzzk.naver.com/… 또는 kick.com/…"
                required
              />
              {pendingCode ? (
                <p className="text-xs">
                  검증 코드: <code className="font-mono">{pendingCode}</code>
                </p>
              ) : null}
              <Button type="submit" disabled={pending || !channelInput.trim()}>
                채널 등록
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        라이브 시작은{" "}
        <Link href="/live/external/new" className="text-primary hover:underline">
          외부 방송 연결
        </Link>
        에서 인증된 계정만 선택할 수 있습니다.
      </p>
    </div>
  );
}
