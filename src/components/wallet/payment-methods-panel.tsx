"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  chooseDefaultPaymentMethod,
  removePaymentMethod,
  startAddPaymentMethod,
} from "@/actions/payment-methods";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreditCard, Loader2, Plus } from "lucide-react";

type Props = {
  methods: SavedPaymentMethod[];
};

function expLabel(pm: SavedPaymentMethod) {
  return `${String(pm.expMonth).padStart(2, "0")}/${String(pm.expYear).slice(-2)}`;
}

const CARD_COLORS = ["from-[#1B4A8C] via-[#2E4A8E] to-[#163a72]", "from-[#D4A63A] to-[#C5522A]", "from-[#2d6a4f] to-[#1b4332]", "from-[#2a3550] to-[#111827]"];

export function PaymentMethodsPanel({ methods: initial }: Props) {
  const router = useRouter();
  const [methods, setMethods] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);

  const stackCards = useMemo(() => {
    const saved = [...methods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    const savedEntries = saved.map((pm, i) => ({
      kind: "saved" as const,
      pm,
      color: CARD_COLORS[i % CARD_COLORS.length]!,
    }));
    const addEntry = { kind: "add" as const, color: "from-[#1a1f2e] to-[#0f1219]" };
    if (savedEntries.length === 0) return [addEntry];
    return [addEntry, ...savedEntries.slice().reverse()];
  }, [methods]);

  async function addCard() {
    setAdding(true);
    setMsg("");
    const res = await startAddPaymentMethod();
    setAdding(false);
    if ("error" in res && res.error) {
      setMsg(res.error);
      return;
    }
    if ("checkoutUrl" in res && res.checkoutUrl) window.location.href = res.checkoutUrl;
  }

  function setDefault(id: string) {
    startTransition(async () => {
      setMsg("");
      const res = await chooseDefaultPaymentMethod(id);
      if ("error" in res && res.error) setMsg(res.error);
      else if ("methods" in res && res.methods) {
        setMethods(res.methods);
        router.refresh();
      }
    });
  }

  function removeCard(id: string) {
    startTransition(async () => {
      setMsg("");
      const res = await removePaymentMethod(id);
      if ("error" in res && res.error) setMsg(res.error);
      else if ("methods" in res && res.methods) {
        setMethods(res.methods);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto w-full max-w-md pt-4 pb-2" style={{ minHeight: 280 }}>
        {stackCards.map((entry, index) => {
          const depth = stackCards.length - 1 - index;
          const isFront = depth === 0;
          const y = depth * 14;
          const scale = 1 - depth * 0.04;
          const z = index + 1;

          if (entry.kind === "add") {
            return (
              <button
                key="add"
                type="button"
                onClick={() => void addCard()}
                disabled={adding || pending}
                className={cn(
                  "absolute left-2 right-2 h-44 rounded-3xl border border-dashed border-white/25 bg-gradient-to-br text-left shadow-lg transition-transform",
                  entry.color,
                  isFront && "ring-2 ring-white/20"
                )}
                style={{ transform: `translateY(${y}px) scale(${scale})`, zIndex: z }}
              >
                <div className="flex h-full flex-col justify-center gap-2 p-6">
                  <div className="flex items-center gap-2 text-white/90">
                    <Plus className="h-5 w-5" />
                    <span className="font-black text-lg">결제 수단 추가</span>
                  </div>
                  <p className="text-sm text-white/70">카드를 등록해 두면 결제할 때 선택할 수 있습니다</p>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin text-white/80" /> : null}
                </div>
              </button>
            );
          }

          const pm = entry.pm;
          return (
            <div
              key={pm.id}
              className={cn(
                "absolute left-3 right-3 h-44 rounded-3xl bg-gradient-to-br shadow-xl border border-white/15 overflow-hidden",
                entry.color,
                pm.isDefault && isFront && "ring-2 ring-white/30"
              )}
              style={{ transform: `translateY(${y + 8}px) scale(${scale})`, zIndex: z }}
            >
              <div className="relative flex h-full flex-col justify-between p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-white/70 font-semibold">{pm.isDefault ? "기본 결제 수단" : pm.brand}</p>
                    <p className="text-2xl font-black text-white mt-1 tracking-widest">•••• {pm.last4}</p>
                  </div>
                  <CreditCard className="h-6 w-6 text-white/40" />
                </div>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-xs text-white/75">{expLabel(pm)} · {pm.brand}</p>
                  {isFront ? (
                    <div className="flex gap-1">
                      {!pm.isDefault ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-7 text-[11px]"
                          disabled={pending}
                          onClick={() => setDefault(pm.id)}
                        >
                          기본
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px] text-white/90 hover:text-white"
                        disabled={pending}
                        onClick={() => removeCard(pm.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {methods.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground px-4">
          등록된 카드가 없습니다. 맨 앞 카드를 눌러 첫 결제 수단을 추가하세요.
        </p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          카드를 좌우로 넘기듯 아래 스택에서 선택 · 결제 시 목록에서 고릅니다
        </p>
      )}

      {msg ? <p className="text-sm text-center text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
