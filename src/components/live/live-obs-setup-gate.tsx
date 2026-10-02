"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Monitor, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setObsStudioReady } from "@/lib/live-obs-studio-ready";

type ObsCreds = { obsServer: string; obsStreamKey: string };

async function fetchObsCredentials(channelId: string): Promise<ObsCreds> {
  const res = await fetch(`/api/live/${channelId}/obs`, {
    credentials: "include",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : t("live.obs_5"));
  }
  const server = body.obsServer || body.url || "";
  const key = body.obsStreamKey || body.streamKey || "";
  if (!server || !key) throw new Error(t("live.swt2v5h"));
  return { obsServer: server, obsStreamKey: key };
}

/** OBS 키 연결 확인 — 확인 후에만 방송 화면으로 */
export function LiveObsSetupGate({
  channelId,
  channelName,
  onReady,
  onEndStream,
}: {
  channelId: string;
  channelName: string;
  onReady: () => void;
  onEndStream: () => void;
}) {
  const { t } = useLocale();
  const [creds, setCreds] = useState<ObsCreds | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [obsPasted, setObsPasted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCreds(await fetchObsCredentials(channelId));
    } catch (e) {
      setCreds(null);
      setError(e instanceof Error ? e.message : t("live.saa7ppw"));
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    void load();
  }, [load]);

  function copyAll() {
    if (!creds) return;
    void navigator.clipboard.writeText(
      t("live.s17yr8n2", { v0: creds.obsServer, v1: creds.obsStreamKey })
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function confirmEnter() {
    setObsStudioReady(channelId);
    onReady();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("live.obs_12")}</p>
      </div>
    );
  }

  if (error || !creds) {
    return (
      <div className="max-w-md mx-auto space-y-4 p-6">
        <p className="text-sm text-destructive">{error || t("live.sk7ltev")}</p>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => void load()}>
          {t("toast.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      <div className="text-center space-y-2">
        <Monitor className="h-10 w-10 mx-auto text-violet-600" />
        <h2 className="text-xl font-bold">{channelName}</h2>
        <p className="text-sm text-muted-foreground">
          {t("live.obs_13")}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">
          {t("live.obs_14")} <strong className="text-foreground">{t("live.s52hplu")}</strong>
        </p>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">{t("live.sxvqg")}</p>
          <code className="block text-xs bg-muted rounded-lg px-3 py-2 break-all select-all">
            {creds.obsServer}
          </code>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">{t("live.soir95o")}</p>
          <code className="block text-xs bg-muted rounded-lg px-3 py-2 break-all font-mono select-all">
            {creds.obsStreamKey}
          </code>
        </div>
        <Button type="button" variant="secondary" size="sm" className="w-full rounded-xl gap-1" onClick={copyAll}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          서버 + 키 복사
        </Button>
      </div>

      <label className="flex items-start gap-2 text-sm cursor-pointer px-1">
        <input
          type="checkbox"
          className="mt-1"
          checked={obsPasted}
          onChange={(e) => setObsPasted(e.target.checked)}
        />
        <span>{t("live.obs_15")}</span>
      </label>

      <Button
        type="button"
        className="w-full rounded-xl h-11 text-base gap-2"
        disabled={!obsPasted}
        onClick={confirmEnter}
      >
        <Radio className="h-5 w-5" />
        {t("live.sz9drgi")}
      </Button>

      <div className="flex justify-center">
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onEndStream}>
          {t("live.s1ducxm4")}
        </Button>
      </div>
    </div>
  );
}
