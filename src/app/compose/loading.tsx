import { AppPageChrome } from "@/components/layout/app-page-chrome";

export default function ComposeLoading() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <div className="animate-pulse space-y-4">
        <div className="h-10 rounded-xl bg-muted" />
        <div className="h-40 rounded-xl bg-muted" />
      </div>
    </AppPageChrome>
  );
}
