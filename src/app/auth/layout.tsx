import { LegalFooterLinks } from "@/components/legal/legal-footer-links";
import { AuthLayoutHeader } from "@/components/auth/auth-layout-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <AuthLayoutHeader />
      <div className="flex-1">{children}</div>
      <footer className="auth-layout-footer px-4 py-4 border-t border-border bg-background/80">
        <LegalFooterLinks />
      </footer>
    </div>
  );
}
