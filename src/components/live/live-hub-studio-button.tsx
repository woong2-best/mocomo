"use client";

import Link from "next/link";
import { MonitorPlay } from "lucide-react";

export function LiveHubStudioButton({ href }: { href: string }) {
  return (
    <Link href={href} className="live-hub-studio-neon shrink-0">
      <MonitorPlay className="h-[1.15em] w-[1.15em] shrink-0" strokeWidth={2.25} aria-hidden />
      <span>Studio</span>
    </Link>
  );
}
