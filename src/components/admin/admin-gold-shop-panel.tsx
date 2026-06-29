"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminBulkGoldShopAction,
  adminCreateGoldShopOffer,
  adminToggleGoldShopField,
  adminUpdateGoldShopOffer,
  getGoldShopAdminDetail,
} from "@/actions/admin-gold-shop";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import { GoldShopOfferPreview } from "@/components/admin/gold-shop-offer-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  AdminGoldShopDetailDto,
  AdminGoldShopOfferDto,
  CatalogItemOption,
  GoldShopOfferStatus,
} from "@/lib/apt/economy/admin-gold-shop-service";
import {
  formatOfferPeriod,
  statusLabel,
} from "@/lib/apt/economy/admin-gold-shop-service";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Props = {
  offers: AdminGoldShopOfferDto[];
  catalogItems: CatalogItemOption[];
};

const STATUS_STYLE: Record<GoldShopOfferStatus, string> = {
  selling: "bg-emerald-100 text-emerald-800",
  scheduled: "bg-sky-100 text-sky-800",
  ended: "bg-muted text-muted-foreground",
  sold_out: "bg-rose-100 text-rose-800",
  hidden: "bg-zinc-200 text-zinc-600",
};

function ToggleChip({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors",
        checked ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <input
        type="checkbox"
        className="h-3 w-3 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function AdminGoldShopPanel({ offers: initialOffers, catalogItems }: Props) {
  const router = useRouter();
  const [offers, setOffers] = useState(initialOffers);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(initialOffers[0]?.id ?? null);
  const [detail, setDetail] = useState<AdminGoldShopDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState<"dates" | "price" | null>(null);
  const [bulkDates, setBulkDates] = useState({ startsAt: "", endsAt: "" });
  const [bulkPercent, setBulkPercent] = useState("-10");

  const [createForm, setCreateForm] = useState({
    itemId: catalogItems[0]?.itemId ?? "",
    goldPrice: catalogItems[0]?.basePrice ?? 100,
    limitedStock: "",
    startsAt: "",
    endsAt: "",
    featured: false,
    isNew: true,
    enabled: true,
  });

  useEffect(() => {
    setOffers(initialOffers);
  }, [initialOffers]);

  const focusOffer = useMemo(
    () => offers.find((o) => o.id === focusId) ?? null,
    [offers, focusId]
  );

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const d = await getGoldShopAdminDetail(id);
    setDetail(d);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (focusId) void loadDetail(focusId);
    else setDetail(null);
  }, [focusId, loadDetail]);

  const previewOffer = detail ?? focusOffer;

  async function toggle(
    offerId: string,
    field: "featured" | "isNew" | "enabled" | "isLimited",
    value: boolean
  ) {
    setBusy(`${offerId}:${field}`);
    setOffers((prev) =>
      prev.map((o) => {
        if (o.id !== offerId) return o;
        if (field === "isLimited") {
          return {
            ...o,
            isLimited: value,
            limitedStock: value ? (o.limitedStock ?? 50) : null,
            remainingStock: value ? (o.limitedStock ?? 50) - o.soldCount : null,
          };
        }
        return { ...o, [field]: value };
      })
    );
    await adminToggleGoldShopField(offerId, field, value);
    setBusy(null);
    router.refresh();
    if (focusId === offerId) void loadDetail(offerId);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(offers.map((o) => o.id)) : new Set());
  }

  async function runBulk(type: Parameters<typeof adminBulkGoldShopAction>[1]["type"], extra?: object) {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBusy(`bulk:${type}`);
  if (type === "delete" && !confirm(`${ids.length}개 상품을 삭제할까요?`)) {
      setBusy(null);
      return;
    }
    await adminBulkGoldShopAction(ids, { type, ...extra } as Parameters<
      typeof adminBulkGoldShopAction
    >[1]);
    setBusy(null);
    setSelectedIds(new Set());
    setBulkOpen(null);
    router.refresh();
  }

  async function onCreate() {
    setBusy("create");
    const item = catalogItems.find((c) => c.itemId === createForm.itemId);
    const res = await adminCreateGoldShopOffer({
      itemId: createForm.itemId,
      goldPrice: createForm.goldPrice,
      originalGoldPrice: item && item.basePrice > createForm.goldPrice ? item.basePrice : null,
      limitedStock: createForm.limitedStock ? Number(createForm.limitedStock) : null,
      startsAt: createForm.startsAt || null,
      endsAt: createForm.endsAt || null,
      featured: createForm.featured,
      isNew: createForm.isNew,
      enabled: createForm.enabled,
    });
    setBusy(null);
    if ("error" in res) {
      alert(res.error);
      return;
    }
    setCreateOpen(false);
    setFocusId(res.offer.id);
    router.refresh();
  }

  async function saveDetailField(
    field: "goldPrice" | "limitedStock" | "startsAt" | "endsAt",
    value: string
  ) {
    if (!focusId) return;
    setBusy(`edit:${field}`);
    const patch: Record<string, unknown> = {};
    if (field === "goldPrice") patch.goldPrice = Number(value);
    else if (field === "limitedStock")
      patch.limitedStock = value === "" ? null : Number(value);
    else patch[field] = value || null;

    await adminUpdateGoldShopOffer(focusId, patch as Parameters<typeof adminUpdateGoldShopOffer>[1]);
    setBusy(null);
    router.refresh();
    void loadDetail(focusId);
  }

  const availableItems = catalogItems.filter(
    (c) => !offers.some((o) => o.itemId === c.itemId)
  );

  return (
    <div className="space-y-4">
      <AdminEconomyNav />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground self-center">
                {selectedIds.size}개 선택
              </span>
              <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => runBulk("show")}>
                노출
              </Button>
              <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => runBulk("hide")}>
                숨김
              </Button>
              <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => runBulk("feature")}>
                추천
              </Button>
              <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => runBulk("unfeature")}>
                추천 해제
              </Button>
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setBulkOpen("dates")}>
                기간 변경
              </Button>
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setBulkOpen("price")}>
                가격(%)
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!!busy}
                onClick={() => runBulk("delete")}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                삭제
              </Button>
            </>
          )}
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              상품 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>상품 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">아이템</span>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createForm.itemId}
                  onChange={(e) => {
                    const item = catalogItems.find((c) => c.itemId === e.target.value);
                    setCreateForm((f) => ({
                      ...f,
                      itemId: e.target.value,
                      goldPrice: item?.basePrice ?? f.goldPrice,
                    }));
                  }}
                >
                  {availableItems.map((c) => (
                    <option key={c.itemId} value={c.itemId}>
                      {c.label} ({c.itemId})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">가격 (Gold)</span>
                <Input
                  type="number"
                  min={1}
                  value={createForm.goldPrice}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, goldPrice: Number(e.target.value) }))
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">재고 (비우면 무제한)</span>
                <Input
                  type="number"
                  min={1}
                  placeholder="무제한"
                  value={createForm.limitedStock}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, limitedStock: e.target.value }))
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">판매 시작</span>
                  <Input
                    type="date"
                    value={createForm.startsAt}
                    onChange={(e) => setCreateForm((f) => ({ ...f, startsAt: e.target.value }))}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">판매 종료</span>
                  <Input
                    type="date"
                    value={createForm.endsAt}
                    onChange={(e) => setCreateForm((f) => ({ ...f, endsAt: e.target.value }))}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <ToggleChip
                  label="추천"
                  checked={createForm.featured}
                  onChange={(v) => setCreateForm((f) => ({ ...f, featured: v }))}
                />
                <ToggleChip
                  label="신상품"
                  checked={createForm.isNew}
                  onChange={(v) => setCreateForm((f) => ({ ...f, isNew: v }))}
                />
                <ToggleChip
                  label="노출"
                  checked={createForm.enabled}
                  onChange={(v) => setCreateForm((f) => ({ ...f, enabled: v }))}
                />
              </div>
              <Button className="w-full" disabled={busy === "create"} onClick={() => void onCreate()}>
                {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : "등록"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center gap-2 border-b pb-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={selectedIds.size === offers.length && offers.length > 0}
              onChange={(e) => selectAll(e.target.checked)}
            />
            전체 선택 · {offers.length}개 상품
          </div>

          {offers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              등록된 상품이 없습니다. 상품을 추가하세요.
            </p>
          ) : (
            offers.map((offer) => (
              <div
                key={offer.id}
                role="button"
                tabIndex={0}
                onClick={() => setFocusId(offer.id)}
                onKeyDown={(e) => e.key === "Enter" && setFocusId(offer.id)}
                className={cn(
                  "flex gap-3 rounded-xl border p-3 text-left transition-colors",
                  focusId === offer.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                )}
              >
                <input
                  type="checkbox"
                  className="mt-2 shrink-0"
                  checked={selectedIds.has(offer.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelect(offer.id)}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={offer.src}
                  alt={offer.label}
                  className="h-14 w-14 shrink-0 object-contain rounded-lg bg-muted/30"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {offer.featured && (
                      <span className="text-[10px] font-bold text-amber-600">[추천]</span>
                    )}
                    <span className="font-semibold text-sm truncate">{offer.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        STATUS_STYLE[offer.status]
                      )}
                    >
                      {statusLabel(offer.status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {offer.category} · {offer.goldPrice.toLocaleString()}G
                    {offer.discountPercent ? ` · -${offer.discountPercent}%` : ""}
                    {offer.isLimited && offer.remainingStock != null
                      ? ` · 재고 ${offer.remainingStock}`
                      : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    기간 {formatOfferPeriod(offer.startsAt, offer.endsAt)}
                  </p>
                  <div
                    className="flex flex-wrap gap-1.5 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ToggleChip
                      label="추천"
                      checked={offer.featured}
                      disabled={busy === `${offer.id}:featured`}
                      onChange={(v) => void toggle(offer.id, "featured", v)}
                    />
                    <ToggleChip
                      label="노출"
                      checked={offer.enabled}
                      disabled={busy === `${offer.id}:enabled`}
                      onChange={(v) => void toggle(offer.id, "enabled", v)}
                    />
                    <ToggleChip
                      label="신상품"
                      checked={offer.isNew}
                      disabled={busy === `${offer.id}:isNew`}
                      onChange={(v) => void toggle(offer.id, "isNew", v)}
                    />
                    <ToggleChip
                      label="한정"
                      checked={offer.isLimited}
                      disabled={busy === `${offer.id}:isLimited`}
                      onChange={(v) => void toggle(offer.id, "isLimited", v)}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">상점 미리보기</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pb-4">
              {previewOffer ? (
                <GoldShopOfferPreview offer={previewOffer} />
              ) : (
                <p className="text-xs text-muted-foreground">상품을 선택하세요</p>
              )}
            </CardContent>
          </Card>

          {focusOffer && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">상품 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">가격</span>
                  <Input
                    type="number"
                    key={`price-${focusOffer.id}-${focusOffer.goldPrice}`}
                    defaultValue={focusOffer.goldPrice}
                    onBlur={(e) => void saveDetailField("goldPrice", e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">재고 한도</span>
                  <Input
                    type="number"
                    key={`stock-${focusOffer.id}-${focusOffer.limitedStock}`}
                    defaultValue={focusOffer.limitedStock ?? ""}
                    placeholder="무제한"
                    onBlur={(e) => void saveDetailField("limitedStock", e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">시작</span>
                    <Input
                      type="date"
                      key={`start-${focusOffer.id}`}
                      defaultValue={focusOffer.startsAt?.slice(0, 10) ?? ""}
                      onBlur={(e) => void saveDetailField("startsAt", e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">종료</span>
                    <Input
                      type="date"
                      key={`end-${focusOffer.id}`}
                      defaultValue={focusOffer.endsAt?.slice(0, 10) ?? ""}
                      onBlur={(e) => void saveDetailField("endsAt", e.target.value)}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  판매 {focusOffer.soldCount}개
                  {focusOffer.isLimited ? ` / 한도 ${focusOffer.limitedStock}` : ""}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">판매 통계</CardTitle>
            </CardHeader>
            <CardContent>
              {detailLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : detail ? (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <dt className="text-muted-foreground">총 판매</dt>
                  <dd className="font-medium">{detail.stats.totalSold}</dd>
                  <dt className="text-muted-foreground">최근 7일</dt>
                  <dd className="font-medium">{detail.stats.sold7d}</dd>
                  <dt className="text-muted-foreground">최근 30일</dt>
                  <dd className="font-medium">{detail.stats.sold30d}</dd>
                  <dt className="text-muted-foreground">평균 판매가</dt>
                  <dd className="font-medium">{detail.stats.avgPrice.toLocaleString()}G</dd>
                  <dt className="text-muted-foreground">매출 합계</dt>
                  <dd className="font-medium">{detail.stats.revenue.toLocaleString()}G</dd>
                  <dt className="text-muted-foreground">7일 매출</dt>
                  <dd className="font-medium">{detail.stats.revenue7d.toLocaleString()}G</dd>
                  <dt className="text-muted-foreground">구매자 수</dt>
                  <dd className="font-medium">{detail.stats.buyerCount}</dd>
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">변경 이력</CardTitle>
            </CardHeader>
            <CardContent className="max-h-48 overflow-y-auto space-y-2">
              {detail?.changeLogs.length ? (
                detail.changeLogs.map((log) => (
                  <div key={log.id} className="border-b border-border/50 pb-2 text-[11px]">
                    <p className="text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString("ko-KR", {
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      · {log.adminName}
                    </p>
                    <p>
                      <span className="font-medium">{log.field}</span>{" "}
                      {log.before || "—"} → {log.after || "—"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">이력 없음</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={bulkOpen === "dates"} onOpenChange={(o) => !o && setBulkOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>선택 상품 기간 변경</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={bulkDates.startsAt}
              onChange={(e) => setBulkDates((d) => ({ ...d, startsAt: e.target.value }))}
            />
            <Input
              type="date"
              value={bulkDates.endsAt}
              onChange={(e) => setBulkDates((d) => ({ ...d, endsAt: e.target.value }))}
            />
          </div>
          <Button
            onClick={() =>
              void runBulk("set_dates", {
                startsAt: bulkDates.startsAt || null,
                endsAt: bulkDates.endsAt || null,
              })
            }
          >
            적용
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen === "price"} onOpenChange={(o) => !o && setBulkOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>선택 상품 가격 변경 (%)</DialogTitle>
          </DialogHeader>
          <Input
            type="number"
            value={bulkPercent}
            onChange={(e) => setBulkPercent(e.target.value)}
            placeholder="-10 = 10% 할인"
          />
          <Button
            onClick={() => void runBulk("price_percent", { percent: Number(bulkPercent) })}
          >
            적용
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
