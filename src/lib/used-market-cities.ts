import { KOREA_SIDO } from "@/lib/korea-regions";
import { normalizeUsedMarketCountry } from "@/lib/used-regions-global";

const MAJOR_CITIES: Record<string, readonly string[]> = {
  US: [
    "New York",
    "Los Angeles",
    "Chicago",
    "Houston",
    "Phoenix",
    "Philadelphia",
    "San Antonio",
    "San Diego",
    "Dallas",
    "San Jose",
    "Austin",
    "Jacksonville",
    "Fort Worth",
    "Columbus",
    "Charlotte",
    "Seattle",
    "Denver",
    "Boston",
    "Nashville",
    "Detroit",
    "Portland",
    "Las Vegas",
    "Miami",
    "Atlanta",
    "Minneapolis",
    "Orlando",
    "Tampa",
    "Sacramento",
  ],
  JP: [
    "Tokyo",
    "Osaka",
    "Yokohama",
    "Nagoya",
    "Sapporo",
    "Fukuoka",
    "Kobe",
    "Kyoto",
    "Kawasaki",
    "Saitama",
  ],
  TW: ["Taipei", "New Taipei", "Taichung", "Tainan", "Kaohsiung", "Taoyuan"],
  GB: ["London", "Manchester", "Birmingham", "Glasgow", "Liverpool", "Edinburgh", "Bristol", "Leeds"],
  CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  DE: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart"],
  FR: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice"],
  TH: ["Bangkok", "Chiang Mai", "Phuket", "Pattaya"],
  VN: ["Ho Chi Minh City", "Hanoi", "Da Nang"],
  SG: ["Singapore"],
  MY: ["Kuala Lumpur", "Penang", "Johor Bahru"],
  ID: ["Jakarta", "Surabaya", "Bandung", "Bali"],
  PH: ["Manila", "Quezon City", "Cebu", "Davao"],
  IN: ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata"],
  MX: ["Mexico City", "Guadalajara", "Monterrey"],
  BR: ["São Paulo", "Rio de Janeiro", "Brasília", "Curitiba"],
};

export type UsedCityOption = { value: string; label: string };

export function listUsedCityOptions(countryCode?: string | null): UsedCityOption[] {
  const cc = normalizeUsedMarketCountry(countryCode);
  if (cc === "KR") {
    return KOREA_SIDO.map((s) => ({ value: s.id, label: s.short }));
  }
  return (MAJOR_CITIES[cc] ?? []).map((city) => ({ value: city, label: city }));
}
