import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95">
        <Link href={DEFAULT_LANDING_PATH} className="font-black text-lg">
          {BRAND.name}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/auth/signin" className="text-muted-foreground hover:text-foreground">
            로그인
          </Link>
          <Link
            href="/auth/signup"
            className="font-semibold text-primary hover:underline"
          >
            회원가입
          </Link>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="px-4 py-4 border-t border-border bg-background/80">
        <LegalFooterLinks />
      </footer>
    </div>
  );
}
