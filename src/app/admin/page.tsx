import { getAdminStats, getPendingReports } from "@/actions/admin";
import { AdminReportActions } from "@/components/admin/admin-report-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, FileText, AlertTriangle, Coins } from "lucide-react";

export default async function AdminPage() {
  let stats = { users: 0, posts: 0, pendingReports: 0, totalTips: 0 };
  let reports: Awaited<ReturnType<typeof getPendingReports>> = [];

  try {
    stats = await getAdminStats();
    reports = await getPendingReports();
  } catch {
    // not admin or db error
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="h-6 w-6" />
        관리자 패널
      </h1>

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
              <div key={r.id} className="border border-border rounded-lg p-3 text-sm">
                <p className="font-medium">{r.targetType} · {r.reason}</p>
                <p className="text-muted-foreground">신고자: {r.reporter.username}</p>
                <AdminReportActions reportId={r.id} reportedUserId={r.reportedUserId} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
