import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function GamesLiveLoading() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <CardRowsSkeleton rows={5} />
    </AppPageChrome>
  );
}
