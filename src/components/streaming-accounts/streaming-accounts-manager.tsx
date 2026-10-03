"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  connectStreamingAccountOAuth,
  disconnectStreamingAccountAction,
  verifyStreamingAccount,
} from "@/actions/streaming-accounts";
import type { StreamingAccountPublic } from "@/lib/streaming-accounts/types";
import { CONNECTABLE_STREAMING_PLATFORMS } from "@/lib/streaming-accounts/types";
import type { ConnectableStreamingPlatform } from "@/lib/streaming-accounts/types";
import { isOAuthStreamingPlatform } from "@/lib/streaming-accounts/registry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: "YouTube",
  TWITCH: "Twitch",
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
  const connectableInitial = initialAccounts.filter(
    (acc) => acc.platform === "YOUTUBE" || acc.platform === "TWITCH"
  );
  const [accounts, setAccounts] = useState(connectableInitial);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("YOUTUBE");
  const [error, setError] = useState(bannerError ?? "");
  const [success, setSuccess] = useState(
    bannerConnected ? `${PLATFORM_LABELS[bannerConnected] ?? bannerConnected} connected` : ""
  );
  const [pending, startTransition] = useTransition();

  function existingAccountWarning(platform: string): string | null {
    const label = PLATFORM_LABELS[platform] ?? platform;
    const alreadyConnected = accounts.some(
      (account) => account.platform === platform && !account.revokedAt
    );
    if (!alreadyConnected) return null;
    return `Delete your existing ${label} account before connecting another.`;
  }

  async function onOAuthConnect(platform: string, reconnect = false) {
    if (!reconnect) {
      const warning = existingAccountWarning(platform);
      if (warning) {
        setSuccess("");
        setError(warning);
        return;
      }
    }
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await connectStreamingAccountOAuth(platform, reconnect);
      if ("error" in res && res.error) {
        setError(errorText(res.error));
        return;
      }
      if ("url" in res && res.url) {
        window.location.href = res.url;
      }
    });
  }

  async function onVerify(accountId: string) {
    setError("");
    startTransition(async () => {
      const res = await verifyStreamingAccount(accountId);
      if ("error" in res && res.error) {
        setError(errorText(res.error));
        return;
      }
      setSuccess(t("streaming-accounts.s1vfipan"));
      window.location.reload();
    });
  }

  async function onDisconnect(accountId: string) {
    if (!confirm(t("streaming-accounts.sckhf4b"))) return;
    startTransition(async () => {
      const res = await disconnectStreamingAccountAction(accountId);
      if ("error" in res && res.error) {
        setError(errorText(res.error));
        return;
      }
      setAccounts((prev) => prev.filter((account) => account.id !== accountId));
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
          <CardTitle className="text-base">{t("streaming-accounts.s16331ud")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Verify a streaming account you own before receiving tips. Pasting a URL alone is
            not supported. You can connect one YouTube account and one Twitch account.
            Deleting an account releases that channel, so another MoCoMo account can verify
            and register it.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("streaming-accounts.s2eggma")}</p>
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
                      <Badge variant="default">{t("streaming-accounts.su72qr")}</Badge>
                    ) : acc.pendingVerification ? (
                      <Badge variant="secondary">{t("streaming-accounts.s1ona9eb")}</Badge>
                    ) : acc.revokedAt ? (
                      <Badge variant="destructive">{t("streaming-accounts.sw8k5c")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("streaming-accounts.ssi6u5")}</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm">{acc.channelName}</p>
                  <a
                    href={acc.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View channel
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {acc.platform === "YOUTUBE" && !acc.verified ? (
                    <p className="text-xs text-muted-foreground">
                      Reconnect with Google to verify instantly.
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {acc.platform === "YOUTUBE" && !acc.verified ? (
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => onOAuthConnect(acc.platform, true)}
                    >
                      Connect with Google
                    </Button>
                  ) : null}
                  {acc.pendingVerification && acc.platform !== "YOUTUBE" ? (
                    <Button size="sm" disabled={pending} onClick={() => onVerify(acc.id)}>
                      Verify ownership
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
          <CardTitle className="text-base">{t("streaming-accounts.s1pht6jz")}</CardTitle>
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
                {selectedPlatform === "YOUTUBE"
                  ? t("streaming-accounts.google_4")
                  : `Sign in with ${PLATFORM_LABELS[selectedPlatform]} to verify channel ownership.`}
              </p>
              <Button
                type="button"
                disabled={pending}
                onClick={() => onOAuthConnect(selectedPlatform)}
              >
                {`Connect ${PLATFORM_LABELS[selectedPlatform]}`}
              </Button>
              {selectedPlatform === "YOUTUBE" ? (
                <p className="text-xs text-muted-foreground">
                  If Google shows an unverified app warning, tap <strong>{t("streaming-accounts.sucyx")}</strong> →{" "}
                  <strong>{t("streaming-accounts.mocomo_net")}</strong>.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        To go live, choose a verified account under{" "}
        <Link href="/live/external/new" className="text-primary hover:underline">
          External stream setup
        </Link>
        .
      </p>
    </div>
  );
}
