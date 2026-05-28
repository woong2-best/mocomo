import { GridCardsSkeleton } from "@/components/ui/content-skeletons";

export default function StarLoading() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="h-8 w-32 rounded-lg bg-muted animate-pulse" />
      <GridCardsSkeleton count={4} />
    </div>
  );
}
