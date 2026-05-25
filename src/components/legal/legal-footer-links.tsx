import Link from "next/link";

const links = [
  { href: "/legal/terms", label: "이용약관" },
  { href: "/legal/privacy", label: "개인정보처리방침" },
  { href: "/legal/policy", label: "운영정책" },
] as const;

export function LegalFooterLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground ${className}`}
    >
      {links.map((link, i) => (
        <span key={link.href} className="flex items-center gap-3">
          {i > 0 && <span className="text-border">·</span>}
          <Link href={link.href} className="hover:text-primary hover:underline">
            {link.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
