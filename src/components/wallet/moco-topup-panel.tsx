"use client";

import { useState } from "react";
import { createMocoTopupCheckout } from "@/actions/moco";
import { MOCO_TOPUP_PACKAGES } from "@/lib/moco/economy";
import { Button } from "@/components/ui/button";

export function MocoTopupPanel() {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function buy(moco: number) {
    setError("");
    setBusy(moco);
    try {
      const result = await createMocoTopupCheckout(moco);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("checkoutUrl" in result && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div>
        <h2 className="font-semibold">모코 충전</h2>
        <p className="text-xs text-muted-foreground mt-1">
          사이트 표시용 가상 재화입니다 (실환전 아님). 2,000모코 = ₩20,000. 후원 시 크리에이터
          정산에 약 10% 수수료가 적용됩니다. 영상 시청 요금이 아닙니다.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {MOCO_TOPUP_PACKAGES.map((p) => (
          <Button
            key={p.moco}
            type="button"
            variant="outline"
            disabled={busy !== null}
            onClick={() => void buy(p.moco)}
            className="justify-between"
          >
            <span>{p.label}</span>
            <span className="text-muted-foreground">
              {busy === p.moco ? "…" : `₩${p.krw.toLocaleString()}`}
            </span>
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
