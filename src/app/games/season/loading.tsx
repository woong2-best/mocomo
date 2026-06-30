import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function GamesSeasonLoading() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <CardRowsSkeleton rows={4} />
    </AppPageChrome>
  );
}
