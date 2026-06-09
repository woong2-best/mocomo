import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function StudioBackLink() {
  return (
    <Link
      href="/avatar/studio"
      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-folk-cobalt transition-colors mb-2"
    >
      <ChevronLeft className="h-4 w-4" />
      라이브 스튜디오
    </Link>
  );
}
