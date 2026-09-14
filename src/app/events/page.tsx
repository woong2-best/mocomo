import { redirect } from "next/navigation";

/** 광고 등록은 /events/new — 레거시 /events URL 호환 */
export default async function EventsPage({
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
  redirect(query ? `/events/new?${query}` : "/events/new");
}
