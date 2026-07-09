import Link from "next/link";
import {
  getUsedAuctionAdminConfig,
  searchUsedMarketBannedUsers,
} from "@/actions/admin-used-market";
import { AdminUsedMarketPanel } from "@/components/admin/admin-used-market-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { Button } from "@/components/ui/button";
import { Gavel, Shield } from "lucide-react";

export default async function AdminUsedMarketPage() {
  let authorized = true;
  let config = null;
  let bannedUsers: Awaited<ReturnType<typeof searchUsedMarketBannedUsers>>["users"] = [];

  try {
    const [cfgRes, bannedRes] = await Promise.all([
      getUsedAuctionAdminConfig(),
      searchUsedMarketBannedUsers(""),
    ]);
    config = cfgRes.config;
    bannedUsers = bannedRes.users ?? [];
  } catch (e) {
    if (isAdminForbiddenError(e)) authorized = false;
    else throw e;
  }

  if (!authorized) return <AdminAccessDenied />;

  return (
    <AdminPageChrome
      maxWidth="4xl"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gavel className="h-6 w-6" />
          중고거래 · 경매 관리
        </h1>
      }
    >
      <Button variant="outline" size="sm" asChild>
        <Link href="/admin" className="gap-2">
          <Shield className="h-4 w-4" />
          관리자 홈
        </Link>
      </Button>

      <AdminUsedMarketPanel initialConfig={config} initialBannedUsers={bannedUsers} />
    </AdminPageChrome>
  );
}
