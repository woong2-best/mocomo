import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/admin/shell/stat-card";

/** 기능 미구현 메뉴용 공통 플레이스홀더 */
export function AdminPlaceholderPage({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: { label: string }[];
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <DashboardCard
        title={t("lib.live.bead.slots.se86e2d3dcc")}
        description={t("admin.s1ra6py1")}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
            {title} 화면 골격
          </div>
          {actions && actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Button key={a.label} type="button" variant="secondary" disabled>
                  {a.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </DashboardCard>
    </div>
  );
}
