import type { ProfileStreamingChannelLink } from "@/lib/profile-public-streaming";

const PLATFORM_META: Record<
  ProfileStreamingChannelLink["platform"],
  { iconSrc: string; label: string }
> = {
  YOUTUBE: {
    iconSrc: "/brand/youtube.png",
    label: "YouTube channel",
  },
  TWITCH: {
    iconSrc: "/brand/twitch.svg",
    label: "Twitch channel",
  },
};

export function ProfileStreamingChannelButtons({
  links,
  className = "",
}: {
  links: ProfileStreamingChannelLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {links.map((link) => {
        const meta = PLATFORM_META[link.platform];
        return (
          <a
            key={link.platform}
            href={link.channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={link.channelName}
            aria-label={`${meta.label}: ${link.channelName}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 shadow-md ring-1 ring-border/60 backdrop-blur-sm transition hover:brightness-110"
          >
            {/* Brand assets: /brand/youtube.png, /brand/twitch.svg */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.iconSrc}
              alt=""
              className={link.platform === "YOUTUBE" ? "h-7 w-auto" : "h-7 w-7"}
              width={link.platform === "YOUTUBE" ? 40 : 28}
              height={28}
            />
          </a>
        );
      })}
    </div>
  );
}
