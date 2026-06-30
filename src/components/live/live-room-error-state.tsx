import type { LucideIcon } from "lucide-react";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { PageErrorState } from "@/components/ui/app-error-state";

export function LiveRoomErrorState({
  title,
  description,
  icon,
  variant = "default",
  primaryHref = "/live",
  primaryLabel = "라이브 홈",
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  variant?: "default" | "destructive" | "muted";
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <PageErrorState
        title={title}
        description={description}
        icon={icon}
        variant={variant}
        primaryHref={primaryHref}
        primaryLabel={primaryLabel}
        secondaryHref={secondaryHref}
        secondaryLabel={secondaryLabel}
      />
    </AppPageChrome>
  );
}
