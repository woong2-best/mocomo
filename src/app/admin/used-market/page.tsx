import Link from "next/link";
import {
  getUsedAuctionAdminConfig,
  searchUsedMarketBannedUsers,
} from "@/actions/admin-used-market";
import { getAdminUsedMarketAppeals } from "@/actions/admin-used-market-appeal";
import { AdminUsedMarketPanel } from "@/components/admin/admin-used-market-panel";
import { AdminUsedMarketAppealsPanel } from "@/components/admin/admin-used-market-appeals-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { Button } from "@/components/ui/button";
import { listDisputedDigitalCommissions } from "@/lib/digital-commission";
import { AdminDigitalDisputes } from "@/components/admin/admin-digital-disputes";
import { Gavel, Shield } from "lucide-react";

export default async function AdminUsedMarketPage() {
  let authorized = true;
  let config = null;
  let bannedUsers: Awaited<ReturnType<typeof searchUsedMarketBannedUsers>>["users"] = [];
  let appeals: Awaited<ReturnType<typeof getAdminUsedMarketAppeals>> = [];
  let disputes: Awaited<ReturnType<typeof listDisputedDigitalCommissions>> = [];

  try {
    const [cfgRes, bannedRes, appealsRes, disputeRes] = await Promise.all([
      getUsedAuctionAdminConfig(),
      searchUsedMarketBannedUsers(""),
      getAdminUsedMarketAppeals("OPEN"),
      listDisputedDigitalCommissions().catch(() => []),
    ]);
    config = cfgRes.config;
    bannedUsers = bannedRes.users ?? [];
    appeals = appealsRes;
    disputes = disputeRes;
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
          중고거래 · Auction 관리
        </h1>
      }
    >
      <Button variant="outline" size="sm" asChild>
        <Link href="/admin" className="gap-2">
          <Shield className="h-4 w-4" />
          관리자 홈
        </Link>
      </Button>

      <AdminDigitalDisputes items={disputes} />
      <AdminUsedMarketAppealsPanel initialAppeals={appeals} />
      <AdminUsedMarketPanel initialConfig={config} initialBannedUsers={bannedUsers} />
    </AdminPageChrome>
  );
}
