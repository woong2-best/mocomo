"use client";

import { useState } from "react";
import { createPhysicalOrderDraft } from "@/actions/goods-shop";
import { TossPayButton } from "@/components/payments/toss-pay-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PhysicalPurchaseForm({
  productId,
  productTitle,
  unitPrice,
  shippingFee,
  paymentsEnabled,
}: {
  productId: string;
  productTitle: string;
  unitPrice: number;
  shippingFee: number;
  paymentsEnabled: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [address, setAddress] = useState("");
  const [detail, setDetail] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const previewTotal = unitPrice * qty + shippingFee;

  async function prepareOrder(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await createPhysicalOrderDraft({
      productId,
      quantity: qty,
      recipientName: name,
      phone,
      zipCode: zip,
      address,
      detailAddress: detail,
    });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("orderId" in res && res.orderId) {
      setOrderId(res.orderId);
      setAmount(res.amount ?? previewTotal);
    }
  }

  if (orderId) {
    return (
      <div className="space-y-3 rounded-2xl border border-border/60 p-4 bg-muted/20">
        <p className="font-semibold">주문서 준비 완료</p>
        <p className="text-sm">
          결제 금액: <strong className="text-neon-cyan">{amount.toLocaleString()}원</strong>
        </p>
        {paymentsEnabled ? (
          <TossPayButton
            type="PHYSICAL_GOODS"
            amount={amount}
            orderName={productTitle}
            metadata={{ orderId }}
            className="w-full rounded-2xl h-11"
          >
            결제하기
          </TossPayButton>
        ) : (
          <p className="text-sm text-destructive">결제 설정이 필요합니다.</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={prepareOrder} className="space-y-3 rounded-2xl border border-border/60 p-4">
      <h3 className="font-semibold text-sm">배송 정보</h3>
      <Input placeholder="받는 분 이름" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl" />
      <Input placeholder="연락처" value={phone} onChange={(e) => setPhone(e.target.value)} required className="rounded-xl" />
      <Input placeholder="우편번호" value={zip} onChange={(e) => setZip(e.target.value)} required className="rounded-xl" />
      <Input placeholder="주소" value={address} onChange={(e) => setAddress(e.target.value)} required className="rounded-xl" />
      <Input placeholder="상세 주소" value={detail} onChange={(e) => setDetail(e.target.value)} className="rounded-xl" />
      <div className="flex items-center gap-2">
        <label className="text-sm">수량</label>
        <Input
          type="number"
          min={1}
          max={10}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="w-20 rounded-xl"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        상품 {unitPrice.toLocaleString()}원 × {qty} + 배송 {shippingFee.toLocaleString()}원 ={" "}
        <strong>{previewTotal.toLocaleString()}원</strong>
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full rounded-2xl" disabled={loading}>
        {loading ? "준비 중…" : "주문하고 결제하기"}
      </Button>
    </form>
  );
}
