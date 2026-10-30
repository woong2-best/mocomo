import { ProfileSocialMark } from "@/components/profile/profile-social-mark";
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
        const inner = <ProfileSocialMark id={link.id} iconSrc={link.iconSrc} />;
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
            className="inline-flex shrink-0 touch-manipulation items-center justify-center"
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}
