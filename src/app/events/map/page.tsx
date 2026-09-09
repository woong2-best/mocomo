import { EventsMapView } from "@/components/events/events-map-view";
import { getRequestCountryCode } from "@/lib/i18n/server";
import { userCountryToEventCountry } from "@/lib/subculture-event-countries";
import { getSubcultureMapPins } from "@/lib/subculture-events";

export const revalidate = 600;

export default async function EventsMapPage() {
  const countryCode = await getRequestCountryCode();
  const pins = await getSubcultureMapPins(520);
  const eventCountry = userCountryToEventCountry(countryCode);

  return <EventsMapView initialPins={pins} eventCountry={eventCountry} />;
}
