import { fetchAllSubcultureEvents } from "@/lib/subculture-event-fetch";

async function main() {
  const r = await fetchAllSubcultureEvents();
  console.log(
    JSON.stringify(
      {
        count: r.events.length,
        results: r.results.map((x) => ({
          id: x.sourceId,
          n: x.events.length,
          err: x.error,
        })),
        events: r.events.map((e) => ({
          key: e.externalKey,
          title: e.title,
          startsAt: e.startsAt,
          sourceId: e.sourceId,
        })),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
