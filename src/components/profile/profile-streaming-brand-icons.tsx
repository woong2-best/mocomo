/** Static brand marks for settings / empty states (same files as profile channel buttons). */
export function ProfileStreamingBrandIcons({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const yt = size === "sm" ? "h-5 w-auto" : "h-6 w-auto";
  const tw = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <span
        className={`inline-flex ${box} items-center justify-center rounded-full bg-muted ring-1 ring-border/60`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/youtube.png" alt="" className={`${yt} object-contain`} width={36} height={24} />
      </span>
      <span
        className={`inline-flex ${box} items-center justify-center rounded-full bg-muted ring-1 ring-border/60`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/twitch.svg" alt="" className={`${tw} object-contain`} width={24} height={24} />
      </span>
    </div>
  );
}
