import { notFound } from "next/navigation";
import { getChatReportEvidence } from "@/actions/admin-chat-report";
import { AdminChatReportEvidence } from "@/components/admin/admin-chat-report-evidence";

export default async function AdminChatReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getChatReportEvidence(id);
  if ("error" in data) notFound();
  return <AdminChatReportEvidence data={data} />;
}
