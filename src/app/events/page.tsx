import { auth } from "@/lib/auth";
import { getEvents } from "@/actions/events";
import { EventsBrowse } from "@/components/events/events-browse";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export default async function EventsPage() {
  const session = await auth();
  let events: Awaited<ReturnType<typeof getEvents>> = [];
  try {
    events = await getEvents();
  } catch {
    events = [];
  }

  return (
    <AppPageChrome maxWidth="6xl">
      <EventsBrowse events={events} isLoggedIn={!!session?.user} />
    </AppPageChrome>
  );
}
