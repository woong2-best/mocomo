export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

export { geocodeMeetQuery as geocodeMeetPlace, geocodeMeetQuery } from "@/lib/maps/geocode";
export type { GeocodeResult as MeetGeocodeResult } from "@/lib/maps/geocode";
