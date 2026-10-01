"use client";

import type { getChatReportEvidence } from "@/actions/admin-chat-report";
import { AdminReportActions } from "@/components/admin/admin-report-actions";
import { Button } from "@/components/ui/button";

type Evidence = Exclude<Awaited<ReturnType<typeof getChatReportEvidence>>, { error: string }>;

function formatUtc(iso: string) {
  return new Date(iso).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function AdminChatReportEvidence({ data }: { data: Evidence }) {
  const generatedAt = formatUtc(new Date().toISOString());

  return (
    <div className="admin-chat-report-evidence space-y-6 max-w-4xl mx-auto p-4 sm:p-8">
      <style jsx global>{`
        @media print {
          nav,
          header,
          footer,
          .no-print,
          [data-admin-nav] {
            display: none !important;
          }
          .admin-chat-report-evidence {
            max-width: none;
            padding: 0;
          }
          @page {
            size: A4;
            margin: 14mm;
          }
        }
      `}</style>

      <div className="no-print flex flex-wrap gap-2 justify-between items-center">
        <h1 className="text-xl font-bold">채팅 신고 채증</h1>
        <Button type="button" onClick={() => window.print()}>
          Export for Law Enforcement
        </Button>
      </div>

      <section className="print-section border rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          MoCoMo — Law enforcement record
        </h2>
        <p className="text-xs text-muted-foreground">Generated (UTC): {generatedAt}</p>
        <p className="text-sm">
          Report ID: <span className="font-mono">{data.report.id}</span>
        </p>
        <p className="text-sm">Reason: {data.report.reason}</p>
        {data.report.details ? (
          <p className="text-sm whitespace-pre-wrap">Details: {data.report.details}</p>
        ) : null}
        <p className="text-sm">
          Filed (UTC): {formatUtc(data.report.createdAt)}
        </p>
      </section>

      {data.report.productId ? (
        <section className="print-section border rounded-lg p-4 space-y-1">
          <h3 className="font-semibold">Related listing</h3>
          <p className="text-sm font-mono">{data.report.productId}</p>
          {data.report.productTitle ? <p className="text-sm">{data.report.productTitle}</p> : null}
        </section>
      ) : null}

      <section className="print-section border rounded-lg p-4 grid sm:grid-cols-2 gap-4">
        <UserBlock title="Reporter" user={data.reporter} ip={data.report.reporterIp} />
        <UserBlock title="Reported user" user={data.reportedUser} ip={data.report.reportedUserIp} />
      </section>

      <section className="print-section border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Conversation log (UTC)</h3>
        <ul className="space-y-2 text-sm font-mono">
          {data.messages.map((m) => (
            <li key={m.id} className="border-b border-border/40 pb-2">
              <span className="text-muted-foreground">
                {formatUtc(m.createdAt)}
              </span>{" "}
              @{m.sender.username}
              {m.isSystemMessage ? " [system]" : ""}: {m.content ?? ""}
            </li>
          ))}
        </ul>
      </section>

      <div className="no-print">
        <AdminReportActions
          reportId={data.report.id}
          targetType="CHAT_ROOM"
          targetId={data.room?.id ?? data.report.id}
          reportedUserId={data.reportedUser?.id}
          reportedUsername={data.reportedUser?.username}
        />
      </div>
    </div>
  );
}

function UserBlock({
  title,
  user,
  ip,
}: {
  title: string;
  user: Evidence["reporter"];
  ip: string | null | undefined;
}) {
  if (!user) return null;
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <dl className="text-sm space-y-1">
        <div>
          <dt className="text-muted-foreground inline">User ID: </dt>
          <dd className="inline font-mono">{user.id}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground inline">Username: </dt>
          <dd className="inline">@{user.username}</dd>
        </div>
        {user.email ? (
          <div>
            <dt className="text-muted-foreground inline">Email: </dt>
            <dd className="inline">{user.email}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground inline">Report IP: </dt>
          <dd className="inline font-mono">{ip ?? "unknown"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground inline">Signup IP: </dt>
          <dd className="inline font-mono">{user.signupIp ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
