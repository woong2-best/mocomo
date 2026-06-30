import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function GamesHistoryLoading() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <CardRowsSkeleton rows={6} />
    </AppPageChrome>
  );
}
