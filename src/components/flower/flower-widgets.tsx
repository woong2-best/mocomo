"use client";

import { useMemo, useState, useTransition } from "react";
import { PayButton } from "@/components/payments/pay-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemFlowerGift, sendFlowerGift } from "@/actions/flower";
import { FLOWER_CONTEXT_LABELS, FLOWER_REDEEM_FEE_BPS, FLOWER_REDEEM_NET_RATIO } from "@/lib/flower/config";
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

const LETTER_MAX = 800;

/** Flower + handwritten letter presentation card */
export function FlowerLetterCard({
  emoji,
  nameKo,
  faceValueKrw,
  letter,
  fromLabel,
  toLabel,
  dateLabel,
  className = "",
}: {
  emoji: string;
  nameKo: string;
  faceValueKrw?: number;
  letter: string;
  fromLabel?: string;
  toLabel?: string;
  dateLabel?: string;
  className?: string;
}) {
  return (
    <article
      className={`overflow-hidden rounded-2xl border border-rose-200/70 bg-gradient-to-b from-rose-50 via-amber-50/40 to-background shadow-sm dark:border-rose-900/40 dark:from-rose-950/40 dark:via-background ${className}`}
    >
      <div className="relative px-5 pt-6 pb-3 text-center">
        <div
          className="pointer-events-none absolute inset-x-8 top-3 h-16 rounded-full bg-rose-200/30 blur-2xl dark:bg-rose-800/20"
          aria-hidden
        />
        <p
          className="relative text-6xl leading-none drop-shadow-sm motion-safe:animate-[flower-sway_3.2s_ease-in-out_infinite]"
          aria-hidden
        >
          {emoji}
        </p>
        <p className="relative mt-3 text-sm font-semibold tracking-wide">
          {nameKo}
          {faceValueKrw != null ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {faceValueKrw.toLocaleString()}원
            </span>
          ) : null}
        </p>
      </div>

      <div className="mx-3 mb-3 rounded-xl border border-dashed border-amber-900/15 bg-[#fffdf8] px-4 py-4 shadow-inner dark:border-amber-100/10 dark:bg-amber-950/20">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-900/50 dark:text-amber-100/40">
          Letter
        </p>
        {(toLabel || fromLabel) && (
          <div className="mb-3 space-y-0.5 text-xs text-muted-foreground">
            {toLabel ? <p>To. {toLabel}</p> : null}
            {fromLabel ? <p>From. {fromLabel}</p> : null}
          </div>
        )}
        <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-foreground/90">
          {letter || "…"}
        </p>
        {dateLabel ? (
          <p className="mt-4 text-right text-[10px] text-muted-foreground">{dateLabel}</p>
        ) : null}
      </div>
    </article>
  );
}

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
  const [letterMode, setLetterMode] = useState<"default" | "custom">("custom");
  const [letter, setLetter] = useState("");
  const [context, setContext] = useState<FlowerGiftContext>(defaultContext ?? "DIRECT");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const selected = held.find((a) => a.id === assetId);
  const previewLetter =
    letterMode === "default"
      ? selected?.flowerType.defaultMessage ?? ""
      : letter.trim() || selected?.flowerType.defaultMessage || "";

  if (held.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        선물할 Flower Gift가 없습니다. 먼저 구매해 주세요.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-border/60 p-4">
        <div>
          <p className="text-sm font-semibold">꽃과 편지 보내기</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            꽃과 함께 편지가 전달됩니다. 받는 사람이 같이 볼 수 있어요.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">꽃 선택</span>
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={assetId}
            onChange={(e) => {
              setAssetId(e.target.value);
              const next = held.find((a) => a.id === e.target.value);
              if (letterMode === "default" && next) {
                /* preview uses default */
              } else if (!letter.trim() && next) {
                setLetter(next.flowerType.defaultMessage);
              }
            }}
          >
            {held.map((a) => (
              <option key={a.id} value={a.id}>
                {a.flowerType.emoji} {a.flowerType.nameKo} · {a.faceValueKrw.toLocaleString()}원
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">받는 사람</span>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="유저네임"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">전달 위치</span>
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
        </label>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">편지</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setLetterMode("default");
                if (selected) setLetter(selected.flowerType.defaultMessage);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                letterMode === "default"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              기본 문구
            </button>
            <button
              type="button"
              onClick={() => setLetterMode("custom")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                letterMode === "custom"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              직접 쓰기
            </button>
          </div>

          {letterMode === "default" && selected && (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-3 text-sm leading-relaxed">
              {selected.flowerType.defaultMessage}
            </div>
          )}

          {letterMode === "custom" && (
            <div className="space-y-1">
              <textarea
                value={letter}
                onChange={(e) => setLetter(e.target.value.slice(0, LETTER_MAX))}
                rows={6}
                maxLength={LETTER_MAX}
                placeholder={
                  selected
                    ? `예: ${selected.flowerType.defaultMessage}`
                    : "받고 싶은 마음을 편지에 적어 주세요"
                }
                className="w-full rounded-xl border border-amber-900/15 bg-[#fffdf8] px-3 py-3 text-sm leading-relaxed font-serif dark:bg-amber-950/20 dark:border-amber-100/10"
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {letter.length}/{LETTER_MAX}
              </p>
            </div>
          )}
        </div>

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

        <Button
          type="button"
          className="w-full"
          disabled={pending || !to.trim() || (letterMode === "custom" && !letter.trim())}
          onClick={() =>
            start(async () => {
              const body =
                letterMode === "default"
                  ? selected?.flowerType.defaultMessage
                  : letter.trim();
              if (!body) {
                setMsg("편지를 작성해 주세요.");
                return;
              }
              const res = await sendFlowerGift({
                assetId,
                toUsername: to,
                useDefaultMessage: letterMode === "default",
                message: body,
                context,
                contextId: defaultContextId,
                idempotencyKey:
                  typeof crypto !== "undefined" && crypto.randomUUID
                    ? `gift_${crypto.randomUUID()}`
                    : undefined,
              });
              setMsg(res.error ?? "꽃과 편지를 보냈습니다.");
              if (!res.error) window.location.reload();
            })
          }
        >
          {pending ? "전달 중…" : "꽃과 편지 보내기"}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground px-1">미리보기 · 받는 이에게 이렇게 보여요</p>
        {selected ? (
          <FlowerLetterCard
            emoji={selected.flowerType.emoji}
            nameKo={selected.flowerType.nameKo}
            faceValueKrw={selected.faceValueKrw}
            letter={previewLetter}
            toLabel={to.trim() ? `@${to.replace(/^@/, "")}` : "받는 분"}
            fromLabel="나"
          />
        ) : null}
      </div>
    </div>
  );
}

export function FlowerRedeemButton({
  assetId,
  faceValueKrw,
}: {
  assetId: string;
  faceValueKrw: number;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const net = Math.floor(faceValueKrw * FLOWER_REDEEM_NET_RATIO);

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
                  : `환전 요청 완료 · 예상 수령 ${net.toLocaleString()}원 (수수료 ${FLOWER_REDEEM_FEE_BPS / 100}%)`
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
