"use client";

/** Temporary deploy verification — ?apt_debug=1 or always-on tiny stamp in interior */
export function AptBuildStamp({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const id =
    process.env.NEXT_PUBLIC_APT_BUILD_ID ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    "dev";
  return (
    <div
      className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+0.25rem)] left-1 z-[200] rounded bg-black/55 px-1.5 py-0.5 font-mono text-[9px] text-white/80"
      data-apt-build={id}
    >
      apt:{id}
    </div>
  );
}
