"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmoticonToStreamer } from "@/actions/goods-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift } from "lucide-react";

export function SendEmoticonForm({
  itemId,
  packName,
  pricePaid,
}: {
  itemId: string;
  packName: string;
  pricePaid: number;
}) {
  const [username, setUsername] = useState("");
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setMsgIsError(false);
    const res = await sendEmoticonToStreamer(itemId, username);
    setLoading(false);
    if ("error" in res && res.error) {
      setMsg(errorText(res.error));
      setMsgIsError(true);
      return;
    }
    setMsg(t("market.s1ujxuef", { v0: Math.floor(pricePaid * 0.9).toLocaleString() }));
    setUsername("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-border/60 p-3 bg-muted/20">
      <p className="text-xs text-muted-foreground">
        {t("market.emoticonSendHint", { pack: packName })}
      </p>
      <div className="flex gap-2">
        <Input
          placeholder={t("market.s1txujzd")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-xl"
          disabled={loading}
        />
        <Button type="submit" size="sm" className="rounded-xl shrink-0 gap-1" disabled={loading || !username.trim()}>
          <Gift className="h-4 w-4" />
          {t("market.ssjcvk")}
        </Button>
      </div>
      {msg && <p className={`text-xs ${msgIsError ? "text-destructive" : "text-primary"}`}>{msg}</p>}
    </form>
  );
}
