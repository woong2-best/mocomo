import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export function SellerPortalShell({
  children,
  signedIn = false,
  fromApp = false,
  username,
}: {
  children: React.ReactNode;
  signedIn?: boolean;
  fromApp?: boolean;
  username?: string | null;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4 sm:max-w-3xl">
          <Link href="/market/seller/register" className="flex min-w-0 flex-col">
            <span className="truncate font-serif text-[1.05rem] font-semibold tracking-tight text-foreground">
              {BRAND.name} marketplace
            </span>
            <span className="text-[10px] text-muted-foreground">판매자 등록</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            {signedIn ? (
              username ? (
                <span className="max-w-[120px] truncate text-xs font-medium text-muted-foreground">
                  @{username}
                </span>
              ) : null
            ) : fromApp ? null : (
              <Link
                href="/auth/signin?callbackUrl=/market/seller/register"
                className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted/40"
              >
                로그인
              </Link>
            )}
            {!fromApp ? (
              <Link
                href="/market"
                className="hidden px-1 text-xs text-muted-foreground hover:text-foreground sm:inline sm:text-sm"
              >
                {MARKET_BRAND_NAME}
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:max-w-3xl sm:py-12">{children}</main>
      <footer className="border-t border-border/60 bg-background px-4 py-4 text-center text-xs text-muted-foreground">
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
