"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMyCreatorStudio } from "@/actions/creator-studio";
import { useLocale } from "@/components/providers/locale-provider";
import type { StudioAddon, StudioField, StudioTier } from "@/lib/creator-studio";
import { studioCategoryGroups, studioCategoryLabel, type StudioCategoryOption } from "@/lib/creator-studio-categories";
import { StudioPortfolioEditor } from "@/components/used/studio-portfolio-editor";
import {
  normalizeDraft,
  step1Valid,
  step2Valid,
  step3Valid,
  type StudioDraft,
} from "@/lib/studio-editor-validation";

function rid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const EMPTY: StudioDraft = {
  category: "",
  title: "",
  about: "",
  open: true,
  slotCap: 3,
  deliveryDays: 14,
  revisionNote: "Rough sketch: 1 revision. Flat color: 1 revision. No changes after coloring is finished.",
  currency: "moco",
  coverUrl: "",
  blocks: [],
  tiers: [{ id: "tier1", name: "Half body", price: 80 }],
  addons: [],
  formFields: [
    { id: "look", label: "Character appearance", kind: "text", required: true },
    { id: "persona", label: "Personality", kind: "text", required: true },
    { id: "pose", label: "Pose and expression", kind: "text", required: true },
    { id: "ref", label: "Reference image", kind: "image", required: true },
  ],
};

const inputClass =
  "w-full rounded-xl border border-border bg-background p-3.5 text-[15px] outline-none focus:border-folk-terracotta";

type StudioCategoryGroups = [string, StudioCategoryOption[]][];

function coerceDraft(initial: StudioDraft | null | undefined): StudioDraft {
  if (!initial || typeof initial !== "object") return EMPTY;
  const tiers = Array.isArray(initial.tiers)
    ? initial.tiers.filter((tier) => tier && typeof tier.id === "string")
    : [];
  const addons = Array.isArray(initial.addons)
    ? initial.addons.filter((addon) => addon && typeof addon.id === "string")
    : [];
  const formFields = Array.isArray(initial.formFields)
    ? initial.formFields.filter((field) => field && typeof field.id === "string")
    : [];
  return {
    category: typeof initial.category === "string" ? initial.category : "",
    title: typeof initial.title === "string" ? initial.title : "",
    about: typeof initial.about === "string" ? initial.about : "",
    open: initial.open !== false,
    slotCap: Number.isFinite(initial.slotCap) ? initial.slotCap : EMPTY.slotCap,
    deliveryDays: Number.isFinite(initial.deliveryDays) ? initial.deliveryDays : EMPTY.deliveryDays,
    revisionNote: typeof initial.revisionNote === "string" ? initial.revisionNote : EMPTY.revisionNote,
    currency: typeof initial.currency === "string" && initial.currency ? initial.currency : EMPTY.currency,
    coverUrl: typeof initial.coverUrl === "string" ? initial.coverUrl : "",
    blocks: Array.isArray(initial.blocks) ? initial.blocks : [],
    tiers: tiers.length > 0 ? tiers : EMPTY.tiers,
    addons,
    formFields: formFields.length > 0 ? formFields : EMPTY.formFields,
  };
}

function resolveCategories(categories: StudioCategoryGroups | null | undefined): StudioCategoryGroups | null {
  if (categories == null) return null;
  if (categories.length > 0) return categories;
  try {
    return studioCategoryGroups();
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Studio categories failed");
    console.error("[StudioEditorForm] categories", error.stack ?? error.message);
    return [];
  }
}

function StudioFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-8 flex-1 animate-pulse rounded-full bg-muted" />
        <div className="h-8 flex-1 animate-pulse rounded-full bg-muted" />
        <div className="h-8 flex-1 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="h-12 animate-pulse rounded-xl bg-muted" />
      <div className="h-12 animate-pulse rounded-xl bg-muted" />
      <div className="h-28 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export function StudioEditorForm({
  initial,
  categories,
  sellerId,
}: {
  initial?: StudioDraft | null;
  categories?: StudioCategoryGroups | null;
  sellerId?: string | null;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const groups = resolveCategories(categories);
  const draftSeed = useMemo(() => coerceDraft(initial), [initial]);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<StudioDraft>(draftSeed);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragField, setDragField] = useState<string | null>(null);

  useEffect(() => {
    if (initial == null) return;
    const broken =
      !Array.isArray(initial.tiers) ||
      !Array.isArray(initial.addons) ||
      !Array.isArray(initial.formFields) ||
      !Array.isArray(initial.blocks);
    if (broken) {
      console.error("[StudioEditorForm] studio draft missing arrays", initial);
    }
  }, [initial]);

  const canNext = useMemo(() => {
    if (step === 1) return step1Valid(draft);
    if (step === 2) return step2Valid(draft);
    return step3Valid(draft);
  }, [draft, step]);

  function patchTier(id: string, patch: Partial<StudioTier>) {
    setDraft((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)),
    }));
  }

  function patchAddon(id: string, patch: Partial<StudioAddon>) {
    setDraft((prev) => ({
      ...prev,
      addons: prev.addons.map((addon) => (addon.id === id ? { ...addon, ...patch } : addon)),
    }));
  }

  function patchField(id: string, patch: Partial<StudioField>) {
    setDraft((prev) => ({
      ...prev,
      formFields: prev.formFields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));
  }

  function moveField(index: number, delta: number) {
    setDraft((prev) => {
      const to = index + delta;
      if (to < 0 || to >= prev.formFields.length) return prev;
      const next = [...prev.formFields];
      const [item] = next.splice(index, 1);
      next.splice(to, 0, item);
      return { ...prev, formFields: next };
    });
  }


  async function save() {
    if (!step3Valid(draft)) return;
    setBusy(true);
    setError("");
    try {
      const result = await saveMyCreatorStudio({
        ...normalizeDraft(draft),
        coverUrl: draft.coverUrl,
        blocks: draft.blocks,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/market/studio/${result.studio.id}`);
      router.refresh();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Studio save failed");
      console.error("[StudioEditorForm] save", error.stack ?? error.message);
      setError(t("validation.invalidInput"));
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    { n: 1, label: t("market.studio.stepBasic") },
    { n: 2, label: t("market.studio.stepPricing") },
    { n: 3, label: t("market.studio.stepSlots") },
  ];

  if (groups == null || sellerId == null) {
    return <StudioFormSkeleton />;
  }

  return (
    <div className="space-y-5 pb-24">
      <p className="text-xs font-semibold leading-5 text-muted-foreground">{t("market.studio.watermarkNote")}</p>
      <div className="flex gap-2">
        {steps.map((item) => (
          <div
            key={item.n}
            className={`flex-1 rounded-full px-2 py-2 text-center text-xs font-extrabold ${
              step === item.n ? "bg-folk-terracotta text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            {item.n}. {item.label}
          </div>
        ))}
      </div>

      {step === 1 ? (
        <>
          <label className="block space-y-2">
            <span className="text-[15px] font-bold">{t("market.studio.category")}</span>
            <button
              type="button"
              onClick={() => setCategoryOpen((open) => !open)}
              className={`${inputClass} text-left font-semibold`}
            >
              {draft.category ? studioCategoryLabel(draft.category) : t("market.studio.categoryPh")}
            </button>
          </label>
          {categoryOpen ? (
            <div className="max-h-72 space-y-4 overflow-y-auto rounded-2xl border border-border p-3">
              {groups.map(([group, items]) => (
                <div key={group} className="space-y-2">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {(items ?? []).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setDraft((prev) => ({ ...prev, category: item.id }));
                          setCategoryOpen(false);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-sm font-bold ${
                          draft.category === item.id
                            ? "border-folk-terracotta bg-folk-terracotta text-white"
                            : "border-border"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-[15px] font-bold">{t("market.studio.title")}</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={t("market.studio.titlePh")}
              className={inputClass}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[15px] font-bold">{t("market.studio.about")}</span>
            <textarea
              value={draft.about}
              onChange={(e) => setDraft((prev) => ({ ...prev, about: e.target.value }))}
              placeholder={t("market.studio.aboutPh")}
              className={`${inputClass} min-h-[120px]`}
            />
          </label>

          <StudioPortfolioEditor
            coverUrl={draft.coverUrl}
            blocks={draft.blocks}
            busy={busy}
            onCover={(coverUrl) => setDraft((prev) => ({ ...prev, coverUrl }))}
            onBlocks={(blocks) => setDraft((prev) => ({ ...prev, blocks }))}
            onBusy={setBusy}
            onError={setError}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <section className="space-y-2">
            <p className="text-[15px] font-bold">{t("market.studio.tiers")}</p>
            {draft.tiers.map((tier) => (
              <div key={tier.id} className="flex gap-2">
                <input
                  value={tier.name}
                  onChange={(e) => patchTier(tier.id, { name: e.target.value })}
                  placeholder={t("market.studio.tierName")}
                  className={`${inputClass} flex-1`}
                />
                <label className="flex w-40 items-center gap-2">
                  <input
                    value={tier.price || ""}
                    onChange={(e) =>
                      patchTier(tier.id, { price: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })
                    }
                    inputMode="numeric"
                    placeholder="80"
                    className={`${inputClass} min-w-0 flex-1`}
                  />
                  <span className="shrink-0 text-xs font-extrabold text-muted-foreground">{t("market.studio.moco")}</span>
                </label>
              </div>
            ))}
            <button
              type="button"
              className="text-sm font-extrabold text-folk-terracotta"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  tiers: [...prev.tiers, { id: rid("tier"), name: "", price: 0 }].slice(0, 8),
                }))
              }
            >
              {t("market.studio.addTier")}
            </button>
          </section>

          <section className="space-y-2">
            <p className="text-[15px] font-bold">{t("market.studio.addons")}</p>
            {draft.addons.map((addon) => (
              <div key={addon.id} className="flex gap-2">
                <input
                  value={addon.name}
                  onChange={(e) => patchAddon(addon.id, { name: e.target.value })}
                  placeholder={t("market.studio.addonName")}
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="button"
                  className="rounded-xl border border-border px-3 text-xs font-extrabold"
                  onClick={() =>
                    patchAddon(addon.id, { mode: addon.mode === "fixed" ? "percent" : "fixed" })
                  }
                >
                  {addon.mode === "percent" ? "%" : t("market.studio.moco")}
                </button>
                <input
                  value={addon.amount || ""}
                  onChange={(e) =>
                    patchAddon(addon.id, { amount: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })
                  }
                  inputMode="numeric"
                  className={`${inputClass} w-24`}
                />
              </div>
            ))}
            <button
              type="button"
              className="text-sm font-extrabold text-folk-terracotta"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  addons: [...prev.addons, { id: rid("addon"), name: "", mode: "fixed" as const, amount: 0 }].slice(
                    0,
                    12
                  ),
                }))
              }
            >
              {t("market.studio.addAddon")}
            </button>
          </section>

          <section className="space-y-2">
            <p className="text-[15px] font-bold">{t("market.studio.rules")}</p>
            <label className="flex items-center gap-3">
              <span className="text-sm font-bold">{t("market.studio.days")}</span>
              <input
                value={draft.deliveryDays || ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    deliveryDays: Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                  }))
                }
                inputMode="numeric"
                className={`${inputClass} w-24`}
              />
            </label>
            <p className="text-xs text-muted-foreground">{t("market.studio.revisionsTooltip")}</p>
            <textarea
              value={draft.revisionNote}
              onChange={(e) => setDraft((prev) => ({ ...prev, revisionNote: e.target.value }))}
              placeholder={t("market.studio.revisions")}
              className={`${inputClass} min-h-[120px]`}
            />
          </section>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <section className="space-y-2">
            <p className="text-[15px] font-bold">{t("market.studio.slots")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, open: !prev.open }))}
                className={`rounded-full px-4 py-2 text-sm font-extrabold ${
                  draft.open ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {draft.open ? t("market.studio.open") : t("market.studio.closed")}
              </button>
              <input
                value={draft.slotCap || ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    slotCap: Number(e.target.value.replace(/[^0-9]/g, "")) || 0,
                  }))
                }
                inputMode="numeric"
                className={`${inputClass} w-24`}
              />
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[15px] font-bold">{t("market.studio.form")}</p>
            <p className="text-xs text-muted-foreground">{t("market.studio.formHint")}</p>
            {draft.formFields.map((field, index) => (
              <div
                key={field.id}
                draggable
                onDragStart={() => setDragField(field.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragField || dragField === field.id) return;
                  setDraft((prev) => {
                    const from = prev.formFields.findIndex((item) => item.id === dragField);
                    const to = prev.formFields.findIndex((item) => item.id === field.id);
                    if (from < 0 || to < 0) return prev;
                    const next = [...prev.formFields];
                    const [item] = next.splice(from, 1);
                    next.splice(to, 0, item);
                    return { ...prev, formFields: next };
                  });
                  setDragField(null);
                }}
                className="space-y-2 rounded-2xl border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center text-xs font-extrabold text-folk-terracotta">
                    <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0}>
                      ↑
                    </button>
                    <span className="cursor-grab select-none text-muted-foreground">☰</span>
                    <button type="button" onClick={() => moveField(index, 1)} disabled={index === draft.formFields.length - 1}>
                      ↓
                    </button>
                  </div>
                  <input
                    value={field.label}
                    onChange={(e) => patchField(field.id, { label: e.target.value })}
                    placeholder={t("market.studio.fieldName")}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    disabled={draft.formFields.length < 2}
                    className="text-sm font-extrabold text-folk-terracotta disabled:opacity-30"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        formFields:
                          prev.formFields.length > 1
                            ? prev.formFields.filter((item) => item.id !== field.id)
                            : prev.formFields,
                      }))
                    }
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="rounded-xl border border-border px-3 py-1.5 text-xs font-extrabold"
                    onClick={() => patchField(field.id, { kind: field.kind === "image" ? "text" : "image" })}
                  >
                    {field.kind === "image" ? t("market.studio.image") : t("market.studio.text")}
                  </button>
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => patchField(field.id, { required: e.target.checked })}
                    />
                    {t("market.studio.required")}
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-sm font-extrabold text-folk-terracotta"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  formFields: [
                    ...prev.formFields,
                    { id: rid("field"), label: "", kind: "text" as const, required: true },
                  ].slice(0, 8),
                }))
              }
            >
              {t("market.studio.addField")}
            </button>
          </section>
        </>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-3">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((n) => Math.max(1, n - 1))}
            className={`h-11 rounded-full border border-border text-sm font-extrabold ${
              step === 3 ? "w-[30%]" : "flex-1"
            }`}
          >
            {t("market.studio.back")}
          </button>
        ) : (
          <div className="flex-1" />
        )}
        {step < 3 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep((n) => Math.min(3, n + 1))}
            className="h-11 flex-1 rounded-full bg-folk-cobalt text-sm font-extrabold text-white disabled:opacity-45"
          >
            {t("market.studio.next")}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || !canNext}
            onClick={() => void save()}
            className="h-12 w-[70%] rounded-full bg-folk-terracotta text-base font-extrabold text-white disabled:opacity-45"
          >
            {busy ? t("ui.publishing") : t("market.studio.save")}
          </button>
        )}
      </div>
    </div>
  );
}
