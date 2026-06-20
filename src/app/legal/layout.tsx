import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LegalFooterLinks } from "@/components/legal/legal-footer-links";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Link href={DEFAULT_LANDING_PATH} className="font-black text-lg shrink-0">
            {BRAND.name}
          </Link>
          <LegalFooterLinks />
        </div>
      </header>
      <main className="px-4 py-8 lg:py-12">{children}</main>
    </div>
  );
}
