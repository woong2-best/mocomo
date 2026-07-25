import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { EventsMapView } from "@/components/events/events-map-view";
import { getRequestCountryCode } from "@/lib/i18n/server";
import { userCountryToEventCountry } from "@/lib/subculture-event-countries";
import { getSubcultureMapPinsForUser } from "@/lib/subculture-events";

export const revalidate = 600;

export default async function EventsMapPage() {
  const countryCode = await getRequestCountryCode();
  const pins = await getSubcultureMapPinsForUser(200, countryCode);
  const eventCountry = userCountryToEventCountry(countryCode);

  return (
    <AppPageChrome maxWidth="4xl">
      <EventsMapView initialPins={pins} eventCountry={eventCountry} />
    </AppPageChrome>
  );
}
