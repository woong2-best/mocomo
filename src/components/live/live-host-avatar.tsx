"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserProfileLink } from "@/components/user/user-profile-link";
import { userAvatarFallbackInitial } from "@/lib/user-public-select";
import { cn } from "@/lib/utils";

/** Squircle host face on live cards — same shape as every other profile avatar. */
export function LiveHostAvatar({
  username,
  name,
  image,
  className,
}: {
  username: string;
  name?: string | null;
  image?: string | null;
  className?: string;
}) {
  const face = (
    <Avatar className={cn("h-9 w-9 ring-2 ring-white/15 ring-offset-0", className)}>
      <AvatarImage src={image} alt={username} />
      <AvatarFallback>{userAvatarFallbackInitial({ username, name })}</AvatarFallback>
    </Avatar>
  );

  if (!username.trim()) return face;

  return (
    <UserProfileLink username={username} className="shrink-0 rounded-sm">
      {face}
    </UserProfileLink>
  );
}
