import { ProfileHeaderSkeleton, ProfileTimelineSkeleton } from "@/components/ui/content-skeletons";

export default function ProfileLoading() {
  return (
    <div className="max-w-5xl mx-auto min-h-screen border-x border-border/40">
      <ProfileHeaderSkeleton />
      <ProfileTimelineSkeleton />
    </div>
  );
}
