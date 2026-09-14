import { redirect } from "next/navigation";

/** @deprecated 광고 등록은 /events 로 통합 */
export default async function LegacyNewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; paid?: string; edit?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.eventId) q.set("eventId", sp.eventId);
  if (sp.paid) q.set("paid", sp.paid);
  if (sp.edit) q.set("edit", sp.edit);
  const query = q.toString();
  redirect(query ? `/events?${query}` : "/events");
}
