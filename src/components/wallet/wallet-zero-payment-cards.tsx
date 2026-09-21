"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  chooseDefaultPaymentMethod,
  removePaymentMethod,
  startAddPaymentMethod,
} from "@/actions/payment-methods";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import { useWalletPay } from "@/components/wallet/wallet-pay-context";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Props = {
  methods: SavedPaymentMethod[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMethodsChange: (methods: SavedPaymentMethod[]) => void;
  onInsertStart?: () => void;
  onInsertEnd?: () => void;
  insertDisabled?: boolean;
  className?: string;
};

function expLabel(pm: SavedPaymentMethod) {
  return `${String(pm.expMonth).padStart(2, "0")}/${String(pm.expYear).slice(-2)}`;
}

function ZeroCardFace({
  pm,
  selected,
  onSelect,
}: {
  pm: SavedPaymentMethod;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative h-[4.75rem] w-[7.5rem] shrink-0 rounded-xl border text-left transition-shadow",
        "bg-gradient-to-br from-[#eceff1] via-[#dfe3e7] to-[#cfd4da]",
        "shadow-[0_6px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.9)]",
        selected
          ? "border-[#6b7280] ring-2 ring-[#9ca3af]/80"
          : "border-[#b8bec6] hover:border-[#9ca3af]",
      )}
    >
      <div className="flex h-full flex-col justify-between p-2.5">
        <div className="flex items-start justify-between gap-1">
          <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">
            {pm.isDefault ? "DEFAULT" : "ZERO"}
          </span>
          <div className="h-4 w-5 rounded-sm border border-[#9ca3af]/60 bg-[#f3f4f6]" aria-hidden />
        </div>
        <div>
          <p className="font-mono text-sm font-black tracking-widest text-[#374151]">•••• {pm.last4}</p>
          <p className="text-[9px] font-semibold text-[#6b7280]">
            {pm.brand} · {expLabel(pm)}
          </p>
        </div>
      </div>
    </button>
  );
}

function ZeroAddCard({ adding, onAdd }: { adding: boolean; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={adding}
      className={cn(
        "relative flex h-[4.75rem] w-[7.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border",
        "border-[#9ca3af] bg-gradient-to-br from-[#f9fafb] to-[#e5e7eb]",
        "text-[#4b5563] shadow-[0_4px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.85)]",
        "hover:border-[#6b7280] disabled:opacity-60",
      )}
    >
      {adding ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-[10px] font-black tracking-tight">카드 등록</span>
        </>
      )}
    </button>
  );
}

function DraggableZeroCard({
  pm,
  selected,
  onSelect,
  onInsertComplete,
  insertDisabled,
}: {
  pm: SavedPaymentMethod;
  selected: boolean;
  onSelect: () => void;
  onInsertComplete: () => void;
  insertDisabled?: boolean;
}) {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 120], [1, 0.85]);
  const [dragging, setDragging] = useState(false);
  const finishInsert = useCallback(async () => {
    await animate(y, 140, { duration: 0.22, ease: "easeIn" });
    onInsertComplete();
    await animate(y, 0, { duration: 0.35, ease: "easeOut" });
    setDragging(false);
  }, [onInsertComplete, y]);

  return (
    <motion.div
      style={{ y, opacity, zIndex: dragging ? 30 : 1 }}
      drag={selected && !insertDisabled ? "y" : false}
      dragConstraints={{ top: 0, bottom: 160 }}
      dragElastic={0.08}
      onDragStart={() => {
        setDragging(true);
      }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 72 || info.velocity.y > 400) {
          void finishInsert();
          return;
        }
        void animate(y, 0, { duration: 0.25 });
        setDragging(false);
      }}
      className={cn(!selected && "pointer-events-none opacity-70")}
    >
      <ZeroCardFace pm={pm} selected={selected} onSelect={onSelect} />
      {selected ? (
        <p className="mt-1 text-center text-[9px] font-semibold text-[#9ca3af]">아래로 밀어 넣기</p>
      ) : null}
    </motion.div>
  );
}

export function WalletZeroPaymentCards({
  methods,
  selectedId,
  onSelect,
  onMethodsChange,
  onInsertStart,
  onInsertEnd,
  insertDisabled,
  className,
}: Props) {
  const router = useRouter();
  const { notifyCardInserted } = useWalletPay();
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  async function addCard() {
    setAdding(true);
    setMsg("");
    const res = await startAddPaymentMethod("/wallet");
    setAdding(false);
    if ("error" in res && res.error) {
      setMsg(res.error);
      return;
    }
    if ("checkoutUrl" in res && res.checkoutUrl) {
      window.location.assign(res.checkoutUrl);
      return;
    }
    setMsg("카드 등록 페이지로 이동하지 못했습니다.");
  }

  function handleInsertComplete() {
    onInsertStart?.();
    notifyCardInserted();
    onInsertEnd?.();
  }

  function setDefault(id: string) {
    startTransition(async () => {
      const res = await chooseDefaultPaymentMethod(id);
      if ("methods" in res && res.methods) {
        onMethodsChange(res.methods);
        router.refresh();
      }
    });
  }

  function removeCard(id: string) {
    startTransition(async () => {
      const res = await removePaymentMethod(id);
      if ("methods" in res && res.methods) {
        onMethodsChange(res.methods);
        if (selectedId === id) onSelect(res.methods[0]?.id ?? null);
        router.refresh();
      }
    });
  }

  const selected = methods.find((m) => m.id === selectedId) ?? null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">결제 카드</p>
      <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5">
        <ZeroAddCard adding={adding} onAdd={() => void addCard()} />
        {methods.map((pm) =>
          selectedId === pm.id ? (
            <DraggableZeroCard
              key={pm.id}
              pm={pm}
              selected
              onSelect={() => onSelect(pm.id)}
              onInsertComplete={handleInsertComplete}
              insertDisabled={insertDisabled}
            />
          ) : (
            <ZeroCardFace key={pm.id} pm={pm} selected={false} onSelect={() => onSelect(pm.id)} />
          ),
        )}
      </div>

      {selected ? (
        <div className="flex flex-wrap items-center gap-2">
          {!selected.isDefault ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setDefault(selected.id)}
              className="rounded-md border border-[#6b7280]/50 bg-[#374151]/40 px-2 py-1 text-[10px] font-bold text-[#d1d5db]"
            >
              기본으로
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => removeCard(selected.id)}
            className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-300"
          >
            <Trash2 className="h-3 w-3" />
            삭제
          </button>
        </div>
      ) : methods.length === 0 ? (
        <p className="text-[11px] leading-relaxed text-[#9ca3af]">
          ZERO 카드 등록 후 리더기 슬롯 방향으로 밀어 결제합니다.
        </p>
      ) : (
        <p className="text-[11px] text-[#9ca3af]">카드를 탭해 선택한 뒤 리더기 쪽으로 밀어 넣으세요.</p>
      )}

      {msg ? <p className="text-[11px] text-red-300">{msg}</p> : null}
    </div>
  );
}
