import {
  ProfileHeaderSkeleton,
  ProfileTimelineSkeleton,
} from "@/components/ui/content-skeletons";
import { ProfileSupportSkeleton } from "@/components/profile/profile-support-skeleton";

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto min-h-screen border-x border-border/40">
      <ProfileHeaderSkeleton />
      <ProfileTimelineSkeleton />
      <ProfileSupportSkeleton />
    </div>
  );
}
