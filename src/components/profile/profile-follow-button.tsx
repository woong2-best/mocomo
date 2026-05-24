"use client";

import { useState, useTransition } from "react";
import { UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followUserAction } from "@/actions/user-profile";

export function ProfileFollowButton({
  userId,
  username,
  initialFollowing,
}: {
  userId: string;
  username: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(async () => {
          await followUserAction(userId, username);
          setFollowing((f) => !f);
        });
      }}
    >
      <Button
        type="submit"
        variant={following ? "outline" : "default"}
        className="rounded-full font-bold px-5 gap-1"
        disabled={pending}
      >
        {following ? (
          <>
            <UserMinus className="h-4 w-4" />
            팔로잉
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            팔로우
          </>
        )}
      </Button>
    </form>
  );
}
