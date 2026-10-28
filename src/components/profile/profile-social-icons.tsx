import type { ProfileSocialLink } from "@/lib/profile-social";

export function ProfileSocialIcons({
  links,
  className = "",
}: {
  links: ProfileSocialLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <div className={`flex shrink-0 items-center gap-2.5 ${className}`}>
      {links.map((link) => {
        const darkChip = link.id === "facebook" || link.id === "twitter";
        const inner = (
          <span
            className={`inline-flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9 ${
              darkChip ? "rounded-lg bg-black p-1" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={link.iconSrc}
              alt=""
              className="h-full w-full object-contain"
              width={32}
              height={32}
              decoding="async"
            />
          </span>
        );
        if (!link.href) {
          return (
            <span key={link.id} title={link.label} className="inline-flex">
              {inner}
            </span>
          );
        }
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            aria-label={link.label}
            className="inline-flex shrink-0 touch-manipulation items-center justify-center opacity-90 transition hover:opacity-100"
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}
