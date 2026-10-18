"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { orderCreatorStudio, waitlistCreatorStudio } from "@/actions/creator-studio";
import type { StudioAddon, StudioField, StudioTier } from "@/lib/creator-studio";

function totalOf(tiers: StudioTier[], addons: StudioAddon[], tierId: string, addonIds: string[]) {
  const tier = tiers.find((item) => item.id === tierId) ?? tiers[0];
  if (!tier) return 0;
  return addons.reduce((sum, addon) => {
    if (!addonIds.includes(addon.id)) return sum;
    return sum + (addon.mode === "percent" ? Math.round((tier.price * addon.amount) / 100) : addon.amount);
  }, tier.price);
}

export function StudioOrderForm({
  studio,
  labels,
}: {
  studio: {
    id: string;
    accepting: boolean;
    currency: string;
    tiers: StudioTier[];
    addons: StudioAddon[];
    formFields: StudioField[];
    deliveryDays: number;
    revisionNote: string;
  };
  labels: {
    tiers: string;
    addons: string;
    rules: string;
    days: string;
    form: string;
    agree: string;
    order: string;
    waitlist: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tierId, setTierId] = useState(studio.tiers[0]?.id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(() => totalOf(studio.tiers, studio.addons, tierId, addonIds), [studio, tierId, addonIds]);

  function setAnswer(field: StudioField, value: string) {
    setAnswers((prev) => ({ ...prev, [field.id]: value }));
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        startTransition(async () => {
          const result = studio.accepting
            ? await orderCreatorStudio({ studioId: studio.id, tierId, addonIds, answers, agreed })
            : await waitlistCreatorStudio(studio.id);
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          if ("listingId" in result && result.listingId) {
            router.push(`/market/${result.listingId}`);
            return;
          }
          router.refresh();
        });
      }}
    >
      <p className="text-sm font-bold">{labels.tiers}</p>
      <div className="flex flex-wrap gap-2">
        {studio.tiers.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => setTierId(tier.id)}
            className={`rounded-full border px-3 py-2 text-sm font-extrabold ${tierId === tier.id ? "border-folk-cobalt bg-folk-cobalt text-white" : "border-border"}`}
          >
            {tier.name} · {tier.price.toLocaleString()} MOCO
          </button>
        ))}
      </div>
      {studio.addons.length > 0 ? <p className="text-sm font-bold">{labels.addons}</p> : null}
      {studio.addons.map((addon) => (
        <label key={addon.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={addonIds.includes(addon.id)}
            onChange={(event) =>
              setAddonIds((prev) =>
                event.target.checked ? [...prev, addon.id] : prev.filter((id) => id !== addon.id)
              )
            }
          />
          {addon.name} · {addon.mode === "percent" ? `+${addon.amount}%` : `+${addon.amount.toLocaleString()} MOCO`}
        </label>
      ))}
      <p className="text-sm font-bold">{labels.rules}</p>
      <p className="text-sm">
        {labels.days}: {studio.deliveryDays}
      </p>
      <p className="text-sm whitespace-pre-wrap">{studio.revisionNote}</p>
      <p className="text-sm font-bold">{labels.form}</p>
      {studio.formFields.map((field) => (
        <label key={field.id} className="block text-sm">
          <span className="font-semibold">{field.label}</span>
          {field.kind === "image" ? (
            <input
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2"
              placeholder="https://"
              value={answers[field.id] || ""}
              onChange={(event) => setAnswer(field, event.target.value)}
            />
          ) : (
            <textarea
              className="mt-1 min-h-20 w-full rounded-xl border bg-background px-3 py-2"
              value={answers[field.id] || ""}
              onChange={(event) => setAnswer(field, event.target.value)}
            />
          )}
        </label>
      ))}
      <label className="flex items-start gap-2 text-xs leading-snug">
        <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
        <span>{labels.agree}</span>
      </label>
      <p className="text-lg font-extrabold">{total.toLocaleString()} MOCO</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button
        type="submit"
        disabled={pending || (studio.accepting && !agreed)}
        className="h-12 w-full rounded-[10px] bg-folk-terracotta font-bold text-white disabled:opacity-50"
      >
        {studio.accepting ? labels.order : labels.waitlist}
      </button>
    </form>
  );
}
