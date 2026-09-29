import Link from "next/link";
import { Repeat2 } from "lucide-react";
import { userDisplayName } from "@/lib/user-public-select";

export function RepostBanner({
  user,
}: {
  user: { username: string; name?: string | null };
}) {
  const label = userDisplayName(user);
  return (
    <p className="mb-2 flex items-center gap-1.5 pl-1 text-[13px] font-medium text-muted-foreground">
      <Repeat2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <Link href={`/u/${user.username}`} className="truncate hover:underline">
        {label}
      </Link>
      <span className="shrink-0">님이 재게시함</span>
    </p>
  );
}
