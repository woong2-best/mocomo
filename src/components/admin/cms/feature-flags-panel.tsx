"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminToggleFeatureFlagAction } from "@/actions/admin-feature-flags";
import { Button } from "@/components/ui/button";

type Flag = {
  key: string;
  enabled: boolean;
  description: string | null;
};

export function FeatureFlagsPanel({ flags }: { flags: Flag[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div>
        <h2 className="font-semibold">Feature Flags</h2>
        <p className="text-xs text-muted-foreground">재배포 없이 ON/OFF · DB FeatureFlag</p>
      </div>
      <ul className="space-y-2">
        {flags.map((f) => (
          <li
            key={f.key}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-mono font-medium">{f.key}</p>
              <p className="text-xs text-muted-foreground">{f.description}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={f.enabled ? "default" : "outline"}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await adminToggleFeatureFlagAction(f.key, !f.enabled);
                  router.refresh();
                })
              }
            >
              {f.enabled ? "ON" : "OFF"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
