import { getAdminStats, getPendingReports } from "@/actions/admin";
import { AdminReportActions } from "@/components/admin/admin-report-actions";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Shield, Users, FileText, AlertTriangle, Coins, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  let stats = { users: 0, posts: 0, pendingReports: 0, totalTips: 0 };
  let reports: Awaited<ReturnType<typeof getPendingReports>> = [];
  let authorized = true;

  try {
    stats = await getAdminStats();
    reports = await getPendingReports();
  } catch {
    authorized = false;
  }

  if (!authorized) {
    return <AdminAccessDenied />;
  }

  return (
    <AdminPageChrome
      maxWidth="4xl"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          관리자 패널
        </h1>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" asChild className="w-full sm:w-auto">
          <Link href="/admin/finance" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            매출 · 정산 · 출금 처리
          </Link>
        </Button>
        <Button variant="secondary" asChild className="w-full sm:w-auto">
          <Link href="/admin/economy" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            APT 경제 · 장터
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "유저", value: stats.users },
          { icon: FileText, label: "게시물", value: stats.posts },
          { icon: AlertTriangle, label: "대기 신고", value: stats.pendingReports },
          { icon: Coins, label: "총 후원", value: stats.totalTips },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>신고 대기열</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-muted-foreground text-sm">대기 중인 신고가 없습니다.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="border border-border rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium">
                  {r.targetType} · {r.reason}
                  {r.reportedUser && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · @{r.reportedUser.username}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground">신고자: @{r.reporter.username}</p>
                {r.details && (
                  <p className="text-muted-foreground text-xs whitespace-pre-wrap">{r.details}</p>
                )}
                {r.post && (
                  <p className="text-xs line-clamp-2 text-foreground/80">
                    {r.post.title || r.post.content}
                  </p>
                )}
                <AdminReportActions
                  reportId={r.id}
                  targetType={r.targetType}
                  targetId={r.targetId}
                  reportedUserId={r.reportedUserId}
                  reportedUsername={r.reportedUser?.username}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AdminPageChrome>
  );
}
