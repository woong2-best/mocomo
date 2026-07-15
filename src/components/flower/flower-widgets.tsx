"use client";

import { useMemo, useState, useTransition } from "react";
import { PayButton } from "@/components/payments/pay-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemFlowerGift, sendFlowerGift } from "@/actions/flower";
import { FLOWER_CONTEXT_LABELS } from "@/lib/flower/config";
import type { FlowerGiftContext } from "@prisma/client";

type FlowerType = {
  id: string;
  slug: string;
  nameKo: string;
  nameEn: string;
  emoji: string;
  priceKrw: number;
  defaultMessage: string;
};

type HeldAsset = {
  id: string;
  faceValueKrw: number;
  status: string;
  flowerType: FlowerType;
};

export function FlowerCatalogBuy({ types }: { types: FlowerType[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {types.map((t) => (
        <div
          key={t.id}
          className="rounded-2xl border border-border/60 p-4 space-y-3 bg-gradient-to-br from-rose-50/40 to-amber-50/20 dark:from-rose-950/20 dark:to-background"
        >
          <div className="flex items-start gap-3">
            <span className="text-4xl leading-none" aria-hidden>
              {t.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {t.nameKo}{" "}
                <span className="text-xs font-normal text-muted-foreground">{t.nameEn}</span>
              </p>
              <p className="text-sm text-primary font-semibold mt-0.5">
                {t.priceKrw.toLocaleString()}원
              </p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                “{t.defaultMessage}”
              </p>
            </div>
          </div>
          <PayButton
            type="FLOWER"
            amount={t.priceKrw}
            orderName={`Flower Gift · ${t.nameEn}`}
            metadata={{
              flowerTypeId: t.id,
              quantity: 1,
              returnPath: "/flowers?tab=wallet",
            }}
            className="w-full"
          >
            구매하기
          </PayButton>
        </div>
      ))}
    </div>
  );
}

export function FlowerSendForm({
  assets,
  defaultTo,
  defaultContext,
  defaultContextId,
}: {
  assets: HeldAsset[];
  defaultTo?: string;
  defaultContext?: FlowerGiftContext;
  defaultContextId?: string;
}) {
  const held = useMemo(() => assets.filter((a) => a.status === "HELD"), [assets]);
  const [assetId, setAssetId] = useState(held[0]?.id ?? "");
  const [to, setTo] = useState(defaultTo ?? "");
  const [useDefault, setUseDefault] = useState(true);
  const [message, setMessage] = useState("");
  const [context, setContext] = useState<FlowerGiftContext>(defaultContext ?? "DIRECT");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const selected = held.find((a) => a.id === assetId);

  if (held.length === 0) {
    return <p className="text-sm text-muted-foreground">선물할 Flower Gift가 없습니다. 먼저 구매해 주세요.</p>;
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <p className="text-sm font-semibold">Flower Gift 보내기</p>
      <select
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        value={assetId}
        onChange={(e) => setAssetId(e.target.value)}
      >
        {held.map((a) => (
          <option key={a.id} value={a.id}>
            {a.flowerType.emoji} {a.flowerType.nameKo} · {a.faceValueKrw.toLocaleString()}원
          </option>
        ))}
      </select>
      <Input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="받는 사람 유저네임"
      />
      <select
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        value={context}
        onChange={(e) => setContext(e.target.value as FlowerGiftContext)}
      >
        {Object.entries(FLOWER_CONTEXT_LABELS).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={useDefault}
          onChange={(e) => setUseDefault(e.target.checked)}
        />
        기본 메시지 사용
        {selected ? ` — “${selected.flowerType.defaultMessage.slice(0, 40)}…”` : ""}
      </label>
      {!useDefault && (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="직접 메시지 작성"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
      )}
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <Button
        type="button"
        disabled={pending || !to.trim()}
        onClick={() =>
          start(async () => {
            const res = await sendFlowerGift({
              assetId,
              toUsername: to,
              useDefaultMessage: useDefault,
              message: useDefault ? undefined : message,
              context,
              contextId: defaultContextId,
              idempotencyKey:
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? `gift_${crypto.randomUUID()}`
                  : undefined,
            });
            setMsg(res.error ?? "선물을 보냈습니다.");
            if (!res.error) window.location.reload();
          })
        }
      >
        {pending ? "보내는 중…" : "선물 보내기"}
      </Button>
    </div>
  );
}

export function FlowerRedeemButton({ assetId, faceValueKrw }: { assetId: string; faceValueKrw: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const net = Math.floor(faceValueKrw * 0.85);

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await redeemFlowerGift({
              assetId,
              idempotencyKey:
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? `redeem_${crypto.randomUUID()}`
                  : undefined,
            });
            if (res.error) setMsg(res.error);
            else
              setMsg(
                res.heldForReview
                  ? "위험 검토로 환전이 대기 중입니다."
                  : `환전 요청 완료 · 예상 수령 ${net.toLocaleString()}원 (수수료 15%)`
              );
            if (!res.error) setTimeout(() => window.location.reload(), 800);
          })
        }
      >
        환전 요청
      </Button>
      {msg && <p className="text-[10px] text-muted-foreground">{msg}</p>}
    </div>
  );
}
