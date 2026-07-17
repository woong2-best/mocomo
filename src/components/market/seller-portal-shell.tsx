import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function SellerPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f6f8]">
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/market/seller/register" className="flex items-baseline gap-2">
            <span className="font-serif text-[1.05rem] font-semibold tracking-tight text-[#1a1a1a]">
              {BRAND.name} marketplace
            </span>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">판매자센터</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/auth/signin?callbackUrl=/market/seller/register"
              className="rounded-md border border-[#c9d4e0] px-3 py-1.5 text-[#1a1a1a] hover:bg-muted/40"
            >
              로그인
            </Link>
            <Link href="/market" className="text-muted-foreground hover:text-foreground px-1">
              MARKET
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-8 sm:py-12">{children}</main>
      <footer className="border-t border-black/6 bg-white px-4 py-4 text-center text-xs text-muted-foreground">
        <Link href="/legal/seller-terms" className="hover:underline">
          판매자 이용약관
        </Link>
        <span className="mx-2">·</span>
        <Link href="/legal/privacy" className="hover:underline">
          개인정보처리방침
        </Link>
      </footer>
    </div>
  );
}
