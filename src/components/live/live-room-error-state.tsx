import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export function LiveRoomErrorState({
  title,
  description,
  primaryHref = "/live",
  primaryLabel = "라이브 홈",
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  description?: React.ReactNode;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-semibold">{title}</p>
        {description && (
          <div className="max-w-sm text-sm text-muted-foreground">{description}</div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild className="rounded-xl">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          {secondaryHref && secondaryLabel && (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </AppPageChrome>
  );
}
