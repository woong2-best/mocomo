"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreateFleaEvent,
  adminCreateFleaNpcOffer,
  adminDeleteFleaEvent,
  adminDeleteFleaNpcOffer,
  adminForceEndFleaEvent,
  adminForceStartFleaEvent,
  adminToggleFleaEvent,
  adminToggleFleaNpcOffer,
  adminUpdateFleaEvent,
  getFleaAdminDetail,
} from "@/actions/admin-flea";
import { AdminEconomyNav } from "@/components/admin/admin-economy-nav";
import { Button } from "@/components/ui/button";
import { InlineConfirm } from "@/components/ui/inline-confirm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CatalogItemOption } from "@/lib/apt/economy/admin-gold-shop-service";
import type {
  AdminFleaEventDetailDto,
  AdminFleaEventDto,
  FleaNpcKind,
} from "@/lib/apt/economy/admin-flea-service";
import { formatFleaPeriod } from "@/lib/apt/economy/admin-flea-service";
import { FLEA_STATUS_LABEL, type FleaEventStatus } from "@/lib/apt/economy/flea-service";
import { cn } from "@/lib/utils";
import { Loader2, Play, Plus, Square, Trash2 } from "lucide-react";

const STATUS_STYLE: Record<FleaEventStatus, string> = {
  scheduled: "bg-sky-100 text-sky-800",
  running: "bg-emerald-100 text-emerald-800",
  ended: "bg-muted text-muted-foreground",
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
        "flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium",
        checked ? "border-violet-500 bg-violet-500/10 text-violet-700" : "border-border text-muted-foreground",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <input
        type="checkbox"
        className="h-3 w-3 accent-violet-600"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

type Props = {
  events: AdminFleaEventDto[];
  catalogItems: CatalogItemOption[];
};

export function AdminFleaPanel({ events: initialEvents, catalogItems }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [focusId, setFocusId] = useState<string | null>(initialEvents[0]?.id ?? null);
  const [detail, setDetail] = useState<AdminFleaEventDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [npcOpen, setNpcOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  const [createForm, setCreateForm] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    feePercent: "5",
    bannerUrl: "",
    description: "",
    published: false,
  });

  const [npcForm, setNpcForm] = useState({
    kind: "sell" as FleaNpcKind,
    stickerTypeId: catalogItems[0]?.itemId ?? "",
    goldPrice: "",
    discountPercent: "30",
    stock: "50",
  });

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const focusEvent = events.find((e) => e.id === focusId) ?? null;

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const d = await getFleaAdminDetail(id);
    setDetail(d);
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (focusId) void loadDetail(focusId);
    else setDetail(null);
  }, [focusId, loadDetail]);

  async function toggleEvent(
    eventId: string,
    field: "active" | "published",
    value: boolean
  ) {
    setBusy(`${eventId}:${field}`);
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, [field]: value } : e))
    );
    await adminToggleFleaEvent(eventId, field, value);
    setBusy(null);
    router.refresh();
    if (focusId === eventId) void loadDetail(eventId);
  }

  async function onCreate() {
    setBusy("create");
    const res = await adminCreateFleaEvent({
      title: createForm.title,
      startsAt: createForm.startsAt,
      endsAt: createForm.endsAt,
      feePercent: Number(createForm.feePercent) || 5,
      bannerUrl: createForm.bannerUrl || null,
      description: createForm.description || null,
      published: createForm.published,
    });
    setBusy(null);
    if ("error" in res) {
      setActionError(res.error ?? "오류가 발생했습니다.");
      return;
    }
    setCreateOpen(false);
    setFocusId(res.event.id);
    router.refresh();
  }

  async function saveField(
    field: Parameters<typeof adminUpdateFleaEvent>[1],
    value: string | number | boolean | null
  ) {
    if (!focusId) return;
    setBusy(`field:${field}`);
    await adminUpdateFleaEvent(focusId, field, value);
    setBusy(null);
    router.refresh();
    void loadDetail(focusId);
  }

  async function onForceStart() {
    if (!focusId) return;
    setBusy("forceStart");
    await adminForceStartFleaEvent(focusId);
    setBusy(null);
    router.refresh();
    void loadDetail(focusId);
  }

  async function onForceEnd() {
    if (!focusId) return;
    setActionError("");
    setBusy("forceEnd");
    await adminForceEndFleaEvent(focusId);
    setBusy(null);
    router.refresh();
    void loadDetail(focusId);
  }

  async function onDeleteEvent() {
    if (!focusId) return;
    setActionError("");
    setBusy("delete");
    const res = await adminDeleteFleaEvent(focusId);
    setBusy(null);
    if ("error" in res) {
      setActionError(res.error ?? "오류가 발생했습니다.");
      return;
    }
    setFocusId(null);
    router.refresh();
  }

  async function onAddNpc() {
    if (!focusId) return;
    setBusy("npc");
    const res = await adminCreateFleaNpcOffer(focusId, {
      kind: npcForm.kind,
      stickerTypeId: npcForm.stickerTypeId,
      goldPrice: npcForm.goldPrice ? Number(npcForm.goldPrice) : undefined,
      discountPercent:
        npcForm.kind === "sell" ? Number(npcForm.discountPercent) || 0 : null,
      stock: npcForm.kind === "sell" && npcForm.stock ? Number(npcForm.stock) : null,
    });
    setBusy(null);
    if ("error" in res) {
      setActionError(res.error ?? "오류가 발생했습니다.");
      return;
    }
    setNpcOpen(false);
    void loadDetail(focusId);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <AdminEconomyNav />

      {actionError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2">
        <p className="text-xs text-muted-foreground self-center">
          상태는 시작/종료 시간에 따라 자동 전환됩니다.
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              이벤트 생성
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>벼룩시장 이벤트 생성</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">이벤트명</span>
                <Input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">시작일</span>
                  <Input
                    type="datetime-local"
                    value={createForm.startsAt}
                    onChange={(e) => setCreateForm((f) => ({ ...f, startsAt: e.target.value }))}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">종료일</span>
                  <Input
                    type="datetime-local"
                    value={createForm.endsAt}
                    onChange={(e) => setCreateForm((f) => ({ ...f, endsAt: e.target.value }))}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">수수료 (%)</span>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  step={0.1}
                  value={createForm.feePercent}
                  onChange={(e) => setCreateForm((f) => ({ ...f, feePercent: e.target.value }))}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">배너 이미지 URL</span>
                <Input
                  placeholder="https://..."
                  value={createForm.bannerUrl}
                  onChange={(e) => setCreateForm((f) => ({ ...f, bannerUrl: e.target.value }))}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">설명</span>
                <Input
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <ToggleChip
                label="공개"
                checked={createForm.published}
                onChange={(v) => setCreateForm((f) => ({ ...f, published: v }))}
              />
              <Button className="w-full" disabled={busy === "create"} onClick={() => void onCreate()}>
                {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : "생성"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          {events.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              등록된 이벤트가 없습니다.
            </p>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                role="button"
                tabIndex={0}
                onClick={() => setFocusId(ev.id)}
                onKeyDown={(e) => e.key === "Enter" && setFocusId(ev.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  focusId === ev.id ? "border-violet-500 bg-violet-500/5" : "border-border hover:bg-muted/40"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{ev.title}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          STATUS_STYLE[ev.status]
                        )}
                      >
                        {FLEA_STATUS_LABEL[ev.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatFleaPeriod(ev.startsAt, ev.endsAt)} · 수수료 {ev.feePercent}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Listing {ev.listingCount} · 거래 {ev.salesCount}건 ·{" "}
                      {ev.volume.toLocaleString()}G
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <ToggleChip
                      label="ON"
                      checked={ev.active}
                      disabled={busy === `${ev.id}:active`}
                      onChange={(v) => void toggleEvent(ev.id, "active", v)}
                    />
                    <ToggleChip
                      label="공개"
                      checked={ev.published}
                      disabled={busy === `${ev.id}:published`}
                      onChange={(v) => void toggleEvent(ev.id, "published", v)}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          {focusEvent && (
            <>
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">운영 제어</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === "forceStart"}
                      onClick={() => void onForceStart()}
                      title="강제 시작"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <InlineConfirm
                      message="이벤트를 강제 종료할까요?"
                      confirmLabel="종료"
                      pending={busy === "forceEnd"}
                      onConfirm={() => void onForceEnd()}
                      renderTrigger={(request) => (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === "forceEnd"}
                          onClick={request}
                          title="강제 종료"
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      )}
                    />
                    <InlineConfirm
                      message="이벤트를 삭제할까요?"
                      confirmLabel="삭제"
                      pending={busy === "delete"}
                      onConfirm={() => void onDeleteEvent()}
                      renderTrigger={(request) => (
                        <Button size="sm" variant="destructive" disabled={busy === "delete"} onClick={request}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {focusEvent.bannerUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={focusEvent.bannerUrl}
                      alt=""
                      className="w-full rounded-lg object-cover max-h-24"
                    />
                  )}
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">공지 문구</span>
                    <Input
                      key={`notice-${focusEvent.id}`}
                      defaultValue={focusEvent.notice ?? ""}
                      onBlur={(e) => void saveField("notice", e.target.value || null)}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">배너 URL</span>
                    <Input
                      key={`banner-${focusEvent.id}`}
                      defaultValue={focusEvent.bannerUrl ?? ""}
                      onBlur={(e) => void saveField("bannerUrl", e.target.value || null)}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <span className="text-xs text-muted-foreground">종료 연장</span>
                      <Input
                        type="datetime-local"
                        key={`end-${focusEvent.id}-${focusEvent.endsAt}`}
                        defaultValue={focusEvent.endsAt.slice(0, 16)}
                        onBlur={(e) => void saveField("endsAt", e.target.value)}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-muted-foreground">수수료 %</span>
                      <Input
                        type="number"
                        key={`fee-${focusEvent.id}`}
                        defaultValue={focusEvent.feePercent}
                        onBlur={(e) =>
                          void saveField("feePercent", Number(e.target.value) || 0)
                        }
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">이벤트 통계</CardTitle>
                </CardHeader>
                <CardContent>
                  {detailLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : detail ? (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <dt className="text-muted-foreground">방문</dt>
                      <dd className="font-medium">{detail.stats.visitCount}</dd>
                      <dt className="text-muted-foreground">등록 Listing</dt>
                      <dd className="font-medium">{detail.stats.listingCount}</dd>
                      <dt className="text-muted-foreground">판매 완료</dt>
                      <dd className="font-medium">{detail.stats.salesCount}</dd>
                      <dt className="text-muted-foreground">거래액</dt>
                      <dd className="font-medium">{detail.stats.volume.toLocaleString()}G</dd>
                      <dt className="text-muted-foreground">평균 판매가</dt>
                      <dd className="font-medium">{detail.stats.avgPrice.toLocaleString()}G</dd>
                      <dt className="text-muted-foreground">평균 할인율</dt>
                      <dd className="font-medium">
                        {detail.stats.avgDiscountPercent != null
                          ? `${detail.stats.avgDiscountPercent}%`
                          : "—"}
                      </dd>
                      <dt className="text-muted-foreground">참여자</dt>
                      <dd className="font-medium">{detail.stats.participantCount}</dd>
                    </dl>
                  ) : null}
                </CardContent>
              </Card>

              {detail && detail.stats.topProducts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">인기 상품 TOP</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {detail.stats.topProducts.map((p, i) => (
                      <div key={p.stickerTypeId} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-muted-foreground">{i + 1}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.src} alt="" className="h-8 w-8 object-contain" />
                        <span className="flex-1 truncate">{p.label}</span>
                        <span className="text-muted-foreground">{p.salesCount}건</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">NPC 상품</CardTitle>
                  <Dialog open={npcOpen} onOpenChange={setNpcOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>NPC 상품 추가</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 text-sm">
                        <select
                          className="w-full rounded-md border px-3 py-2"
                          value={npcForm.kind}
                          onChange={(e) =>
                            setNpcForm((f) => ({ ...f, kind: e.target.value as FleaNpcKind }))
                          }
                        >
                          <option value="sell">NPC 판매 (유저 구매)</option>
                          <option value="buy">NPC 매입 (유저 판매)</option>
                        </select>
                        <select
                          className="w-full rounded-md border px-3 py-2"
                          value={npcForm.stickerTypeId}
                          onChange={(e) =>
                            setNpcForm((f) => ({ ...f, stickerTypeId: e.target.value }))
                          }
                        >
                          {catalogItems.map((c) => (
                            <option key={c.itemId} value={c.itemId}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        {npcForm.kind === "sell" ? (
                          <>
                            <Input
                              type="number"
                              placeholder="할인 %"
                              value={npcForm.discountPercent}
                              onChange={(e) =>
                                setNpcForm((f) => ({ ...f, discountPercent: e.target.value }))
                              }
                            />
                            <Input
                              type="number"
                              placeholder="재고"
                              value={npcForm.stock}
                              onChange={(e) => setNpcForm((f) => ({ ...f, stock: e.target.value }))}
                            />
                          </>
                        ) : (
                          <Input
                            type="number"
                            placeholder="매입가 Gold"
                            value={npcForm.goldPrice}
                            onChange={(e) => setNpcForm((f) => ({ ...f, goldPrice: e.target.value }))}
                          />
                        )}
                        <Button disabled={busy === "npc"} onClick={() => void onAddNpc()}>
                          추가
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-2">
                  {detail?.npcOffers.length ? (
                    detail.npcOffers.map((npc) => (
                      <div
                        key={npc.id}
                        className="flex items-center gap-2 rounded-lg border p-2 text-xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={npc.src} alt="" className="h-8 w-8 object-contain" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {npc.kind === "sell" ? "NPC 판매" : "NPC 매입"} · {npc.label}
                          </p>
                          <p className="text-muted-foreground">
                            {npc.goldPrice.toLocaleString()}G
                            {npc.discountPercent != null ? ` · ${npc.discountPercent}% 할인` : ""}
                            {npc.remaining != null ? ` · 재고 ${npc.remaining}` : ""}
                          </p>
                        </div>
                        <ToggleChip
                          label="ON"
                          checked={npc.enabled}
                          onChange={(v) => {
                            void adminToggleFleaNpcOffer(npc.id, v).then(() => {
                              void loadDetail(focusId!);
                              router.refresh();
                            });
                          }}
                        />
                        <InlineConfirm
                          message="삭제할까요?"
                          confirmLabel="삭제"
                          onConfirm={() => {
                            void adminDeleteFleaNpcOffer(npc.id).then(() => {
                              void loadDetail(focusId!);
                              router.refresh();
                            });
                          }}
                          renderTrigger={(request) => (
                            <button type="button" className="text-rose-500" onClick={request}>
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">NPC 상품 없음</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">변경 이력</CardTitle>
                </CardHeader>
                <CardContent className="max-h-40 overflow-y-auto space-y-2">
                  {detail?.changeLogs.map((log) => (
                    <div key={log.id} className="border-b border-border/50 pb-2 text-[11px]">
                      <p className="text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("ko-KR")} · {log.adminName}
                      </p>
                      <p>
                        <span className="font-medium">{log.field}</span> {log.before || "—"} →{" "}
                        {log.after || "—"}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
