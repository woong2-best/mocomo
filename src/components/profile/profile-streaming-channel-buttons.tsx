import type { ProfileStreamingChannelLink } from "@/lib/profile-public-streaming";

const PLATFORM_META: Record<
  ProfileStreamingChannelLink["platform"],
  { iconSrc: string; label: string; imgClass: string }
> = {
  YOUTUBE: {
    iconSrc: "/brand/youtube.svg",
    label: "YouTube channel",
    imgClass: "h-7 w-auto sm:h-8",
  },
  TWITCH: {
    iconSrc: "/brand/twitch.svg",
    label: "Twitch channel",
    imgClass: "h-7 w-auto sm:h-8",
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
    <div className={`flex items-center gap-2.5 ${className}`}>
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
            className="inline-flex shrink-0 touch-manipulation items-center justify-center rounded-sm opacity-90 transition hover:opacity-100 active:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.iconSrc}
              alt=""
              className={meta.imgClass}
              width={32}
              height={32}
              decoding="async"
            />
          </a>
        );
      })}
    </div>
  );
}
