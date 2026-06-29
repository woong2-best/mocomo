import Link from "next/link";
import { getFraudRulesAdminPageDataAction } from "@/actions/admin-fraud-rules";
import { AdminFraudRulesPanel } from "@/components/admin/admin-fraud-rules-panel";
import { ChevronLeft, Settings2 } from "lucide-react";

export default async function AdminFraudRulesPage() {
  let data: Awaited<ReturnType<typeof getFraudRulesAdminPageDataAction>> | null = null;
  try {
    data = await getFraudRulesAdminPageDataAction();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <p className="text-muted-foreground">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 pb-24">
      <Link
        href="/admin/economy/fraud"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Fraud Detection
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings2 className="h-6 w-6" />
        Fraud Rule Engine
      </h1>
      <AdminFraudRulesPanel rules={data.rules} meta={data.meta} changeLogs={data.changeLogs} />
    </div>
  );
}
