/** Static brand marks for settings (transparent SVGs, no button chrome). */
export function ProfileStreamingBrandIcons({ size = "md" }: { size?: "sm" | "md" }) {
  const img = size === "sm" ? "h-6 w-auto" : "h-7 w-auto";
  return (
    <div className="flex items-center gap-3" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/youtube.svg" alt="" className={img} width={40} height={28} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/twitch.svg" alt="" className={img} width={28} height={28} />
    </div>
  );
}
