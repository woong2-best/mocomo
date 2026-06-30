import Link from "next/link";
import { LEGAL_PAGES } from "@/lib/legal-content";
import type { Metadata } from "next";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export const metadata: Metadata = {
  title: "약관 및 정책 — MoCoMo",
  description: "MoCoMo 이용약관, 개인정보처리방침, 운영정책",
};

export default function LegalIndexPage() {
  return (
    <AppPageChrome maxWidth="3xl">
      <NativePageTitle>
        <h1 className="text-2xl font-bold">약관 및 정책</h1>
      </NativePageTitle>
      <p className="text-sm text-muted-foreground">
        MoCoMo 서비스 이용에 관한 약관과 커뮤니티 운영 정책입니다.
      </p>
      <ul className="space-y-3">
        {LEGAL_PAGES.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              className="block rounded-2xl border border-border p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
            >
              <span className="font-semibold">{page.label}</span>
              <span className="block text-xs text-muted-foreground mt-1">
                최종 업데이트: {page.doc.updatedAt}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AppPageChrome>
  );
}
