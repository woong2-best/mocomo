import type { SubcultureEventCountryCode } from "@/lib/subculture-event-global-config";
import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";

/** 행사장 마스터 — 서브컬처 주요 컨벤션 센터/전시장 고정 좌표 */
export type MasterVenue = {
  id: string;
  country: SubcultureEventCountryCode;
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  /** OpenStreetMap place_id (Nominatim) — 선택 */
  osmPlaceId?: string;
  /** venueName·address·약칭 매칭용 (소문자·발음 구분 없음) */
  aliases: string[];
};

function v(
  id: string,
  country: SubcultureEventCountryCode,
  venueName: string,
  address: string,
  lat: number,
  lng: number,
  aliases: string[],
  osmPlaceId?: string
): MasterVenue {
  return { id, country, venueName, address, lat, lng, aliases, osmPlaceId };
}

/** 국내외 주요 서브컬처 행사장 — 수동 검증 좌표 */
export const SUBCULTURE_VENUE_MASTER: MasterVenue[] = [
  // 🇰🇷 대한민국
  v("bexco", "kr", "BEXCO", "55 APEC-ro, Haeundae-gu, Busan, South Korea", 35.1689, 129.1362, [
    "bexco",
    "벡스코",
    "부산 벡스코",
    "부산벡스코",
  ]),
  v("coex", "kr", "COEX", "513 Yeongdong-daero, Gangnam-gu, Seoul, South Korea", 37.5115, 127.0602, [
    "coex",
    "코엑스",
    "서울 코엑스",
  ]),
  v("kintex", "kr", "KINTEX", "217-60 Kintex-ro, Ilsanseo-gu, Goyang-si, Gyeonggi-do, South Korea", 37.5273, 126.6154, [
    "kintex",
    "킨텍스",
    "일산 킨텍스",
    "킨텍스 제1",
  ]),
  v("kintex2", "kr", "KINTEX Hall 2", "217-60 Kintex-ro, Ilsanseo-gu, Goyang-si, Gyeonggi-do, South Korea", 37.5278, 126.6182, [
    "kintex hall 2",
    "킨텍스 제2",
    "kintex 2",
  ]),
  v("setec", "kr", "SETEC", "3104 Nambusunhwan-ro, Gangnam-gu, Seoul, South Korea", 37.4842, 127.0346, [
    "setec",
    "세텍",
  ]),
  v("bccc", "kr", "Busan Cinema Center", "97 Centum jungang-ro, Haeundae-gu, Busan, South Korea", 35.1698, 129.1312, [
    "bccc",
    "부산문화콘텐츠콤플렉스",
    "센텀",
    "busan cinema center",
  ]),

  // 🇯🇵 일본
  v(
    "tokyo-big-sight",
    "jp",
    "Tokyo Big Sight",
    "3-11-1 Ariake, Koto City, Tokyo, Japan",
    35.6312,
    139.7967,
    ["tokyo big sight", "ビッグサイト", "big sight", "東京ビッグサイト", "有明"]
  ),
  v(
    "makuhari-messe",
    "jp",
    "Makuhari Messe",
    "2-1 Nakase, Mihama Ward, Chiba, Japan",
    35.6481,
    140.0347,
    ["makuhari messe", "makuhari", "幕張メッセ", "幕張"]
  ),
  v(
    "intex-osaka",
    "jp",
    "INTEX Osaka",
    "1-5-102 Nankokita, Suminoe Ward, Osaka, Japan",
    34.6373,
    135.4162,
    ["intex osaka", "インテックス大阪", "intex"]
  ),
  v(
    "kyoto-miyako",
    "jp",
    "Kyoto International Exhibition Hall (Miyako Messe)",
    "9-1 Okazaki Seishoji-cho, Sakyo-ku, Kyoto, Japan",
    35.0178,
    135.7815,
    ["みやこめっせ", "miyako messe", "京まふ", "kyomaf"]
  ),

  // 🇺🇸 미국
  v(
    "san-diego-convention-center",
    "us",
    "San Diego Convention Center",
    "111 W Harbor Dr, San Diego, CA 92101, United States",
    32.7068,
    -117.1618,
    ["san diego convention center", "san diego convention", "111 w harbor dr"]
  ),
  v(
    "javits-center",
    "us",
    "Javits Center",
    "429 11th Ave, New York, NY 10001, United States",
    40.757,
    -74.0027,
    ["javits center", "jacob k javits", "javits"]
  ),
  v(
    "lacc",
    "us",
    "Los Angeles Convention Center",
    "1201 S Figueroa St, Los Angeles, CA 90015, United States",
    34.0403,
    -118.2695,
    ["los angeles convention center", "lacc", "la convention center"]
  ),
  v(
    "mccormick-place",
    "us",
    "McCormick Place",
    "2301 S Lake Shore Dr, Chicago, IL 60616, United States",
    41.8517,
    -87.6165,
    ["mccormick place", "mccormick place chicago"]
  ),
  v(
    "washington-state-convention-center",
    "us",
    "Washington State Convention Center",
    "705 Pike St, Seattle, WA 98101, United States",
    47.6116,
    -122.3305,
    ["washington state convention center", "seattle convention center", "705 pike st seattle"]
  ),
  v(
    "kay-bailey-hutchison",
    "us",
    "Kay Bailey Hutchison Convention Center",
    "650 S Griffin St, Dallas, TX 75202, United States",
    32.7987,
    -96.822,
    ["kay bailey hutchison", "dallas convention center", "650 s griffin st dallas"]
  ),

  // 🇪🇺 유럽
  v(
    "excel-london",
    "gb",
    "ExCeL London",
    "Royal Victoria Dock, 1 Western Gateway, London E16 1XL, United Kingdom",
    51.5081,
    0.0276,
    ["excel london", "exceL london", "excel centre london"]
  ),
  v(
    "koelnmesse",
    "de",
    "Koelnmesse",
    "Messepl. 1, 50679 Köln, Germany",
    50.9413,
    6.9823,
    ["koelnmesse", "kölnmesse", "cologne messe", "messeplatz koln"]
  ),
  v(
    "messe-dusseldorf",
    "de",
    "Messe Düsseldorf",
    "Am Staad, 40474 Düsseldorf, Germany",
    51.2624,
    6.7438,
    ["messe dusseldorf", "messe düsseldorf", "am staad dusseldorf"]
  ),
  v(
    "messe-essen",
    "de",
    "Messe Essen",
    "Norbertstraße 5, 45131 Essen, Germany",
    51.4019,
    6.9723,
    ["messe essen", "spiel essen"]
  ),
  v(
    "paris-nord-villepinte",
    "fr",
    "Parc des Expositions Paris Nord Villepinte",
    "ZAC Paris Nord II, 93420 Villepinte, France",
    48.9742,
    2.5194,
    [
      "paris nord villepinte",
      "villepinte",
      "japan expo paris",
      "parc des expositions de paris nord villepinte",
    ]
  ),
  v(
    "lucca-historic",
    "it",
    "Lucca Historic Center",
    "Lucca, Tuscany, Italy",
    43.843,
    10.504,
    ["lucca comics", "lucca historic", "lucca, tuscany"]
  ),
  v(
    "jaarbeurs-utrecht",
    "nl",
    "Jaarbeurs Utrecht",
    "Jaarbeursplein 6, 3521 AL Utrecht, Netherlands",
    52.0883,
    5.1044,
    ["jaarbeurs", "utrecht jaarbeurs", "heroes dutch comic con"]
  ),
  v(
    "fira-barcelona",
    "es",
    "Fira Barcelona Montjuïc",
    "Av. de la Reina Maria Cristina, Barcelona, Spain",
    41.3595,
    2.1541,
    ["fira barcelona", "fira barcelona montjuic", "manga barcelona"]
  ),
  v(
    "ifema-madrid",
    "es",
    "IFEMA Madrid",
    "Av. del Partenón, 5, 28042 Madrid, Spain",
    40.4652,
    -3.6188,
    ["ifema madrid", "ifema", "madrid games week"]
  ),
  v(
    "wiener-stadthalle",
    "at",
    "Wiener Stadthalle",
    "Roland-Rainer-Platz 1, 1150 Wien, Austria",
    48.2015,
    16.3348,
    ["wiener stadthalle", "vienna comic con", "vienna stadthalle"]
  ),
  v(
    "malmo-massan",
    "se",
    "Malmömässan",
    "Mässvägen 6, 215 32 Malmö, Sweden",
    55.5635,
    12.9757,
    ["malmo massan", "malmömässan", "sweden comic con"]
  ),

  // 🇧🇷 남미
  v(
    "sao-paulo-expo",
    "br",
    "São Paulo Expo",
    "Rodovia dos Imigrantes, 1.5 km - Vila Água Funda, São Paulo - SP, 04329-900, Brazil",
    -23.7034,
    -46.6994,
    ["sao paulo expo", "são paulo expo", "expo center sao paulo", "rodovia dos imigrantes"]
  ),
  v(
    "distrito-anhembi",
    "br",
    "Distrito Anhembi",
    "Av. Olavo Fontoura, 1209 - Santana, São Paulo - SP, Brazil",
    -23.5161,
    -46.634,
    ["distrito anhembi", "anhembi", "av olavo fontoura anhembi"]
  ),
  v(
    "centro-citibanamex",
    "mx",
    "Centro Citibanamex",
    "Av. del Conscripto 311, Lomas de Sotelo, Mexico City, Mexico",
    19.3945,
    -99.1994,
    ["centro citibanamex", "citibanamex", "av del conscripto citibanamex"]
  ),

  // 🇨🇳 중국·중화권
  v(
    "shanghai-world-expo",
    "cn",
    "Shanghai World Expo Exhibition and Convention Center",
    "1099 Guozhan Rd, Pudong, Shanghai, China",
    31.1922,
    121.4859,
    ["shanghai world expo", "bilibili world", "sweec"]
  ),
  v(
    "sniec",
    "cn",
    "SNIEC (Shanghai New International Expo Centre)",
    "2345 Longyang Rd, Pudong, Shanghai, China",
    31.2349,
    121.501,
    ["sniec", "shanghai new international expo", "chinajoy"]
  ),
  v(
    "poly-guangzhou",
    "cn",
    "Poly World Trade Center Exhibition Hall",
    "Xingang East Rd, Haizhu, Guangzhou, China",
    23.1065,
    113.3247,
    ["poly world trade center", "guangzhou poly", "gcaf"]
  ),
  v(
    "ciec-beijing",
    "cn",
    "China International Exhibition Center (Beijing)",
    "6 E 3rd Ring North Rd, Chaoyang, Beijing, China",
    39.9589,
    116.4428,
    ["china international exhibition center beijing", "ciec beijing", "beijingworld"]
  ),
  v(
    "chengdu-century-city",
    "cn",
    "Century City New International Convention & Exhibition Center",
    "198 Shijicheng Rd, Wuhou, Chengdu, China",
    30.5786,
    104.067,
    ["century city chengdu", "chengdu convention", "chengdu expo"]
  ),
  v(
    "hkcec",
    "hk",
    "Hong Kong Convention and Exhibition Centre",
    "1 Expo Dr, Wan Chai, Hong Kong",
    22.283,
    114.1733,
    ["hkcec", "hong kong convention and exhibition centre", "ani-com"]
  ),
  v(
    "twtc",
    "tw",
    "Taipei World Trade Center",
    "5 Sec 5, Xinyi Rd, Xinyi District, Taipei, Taiwan",
    25.0357,
    121.5619,
    ["twtc", "taipei world trade center", "tica"]
  ),

  // 🌏 동남아
  v(
    "suntec-singapore",
    "sg",
    "Suntec Singapore Convention & Exhibition Centre",
    "1 Raffles Blvd, Singapore",
    1.2937,
    103.8558,
    ["suntec singapore", "suntec convention", "afa", "anime festival asia"]
  ),
  v(
    "sands-expo-singapore",
    "sg",
    "Sands Expo & Convention Centre",
    "10 Bayfront Ave, Singapore",
    1.2838,
    103.8607,
    ["sands expo", "marina bay sands expo", "sgcc"]
  ),
  v(
    "klcc",
    "my",
    "Kuala Lumpur Convention Centre",
    "Kuala Lumpur City Centre, Malaysia",
    3.1538,
    101.7123,
    ["klcc", "kuala lumpur convention centre", "comic fiesta"]
  ),
  v(
    "smx-manila",
    "ph",
    "SMX Convention Center Manila",
    "Seashell Ln, Pasay, Metro Manila, Philippines",
    14.5556,
    120.9833,
    ["smx convention center manila", "smx manila", "cosplay mania"]
  ),
  v(
    "bitec-bangkok",
    "th",
    "BITEC Bangkok",
    "88 Bangna-Trad Rd, Bang Na, Bangkok, Thailand",
    13.6693,
    100.6056,
    ["bitec", "bangkok international trade", "thailand comic con"]
  ),
  v(
    "jiexpo-jakarta",
    "id",
    "JIExpo (Jakarta International Expo)",
    "Jl. Benyamin Sueb, Kemayoran, Jakarta, Indonesia",
    -6.145,
    106.8957,
    ["jiexpo", "jakarta international expo", "indonesia comic con"]
  ),

  // 🇨🇦 🇦🇺 🇳🇿
  v(
    "mtcc-toronto",
    "ca",
    "Metro Toronto Convention Centre",
    "255 Front St W, Toronto, ON, Canada",
    43.6436,
    -79.3869,
    ["metro toronto convention centre", "mtcc", "fan expo canada"]
  ),
  v(
    "delta-toronto-airport",
    "ca",
    "Delta Hotels by Marriott Toronto Airport & Conference Centre",
    "655 Dixon Rd, Etobicoke, ON M9W 1J3, Canada",
    43.689661,
    -79.578564,
    ["delta toronto airport", "anime north"]
  ),
  v(
    "mcec-melbourne",
    "au",
    "Melbourne Convention and Exhibition Centre",
    "1 Convention Centre Pl, South Wharf, Melbourne, Australia",
    -37.8267,
    144.954,
    ["melbourne convention and exhibition centre", "mcec", "pax australia", "supanova"]
  ),
  v(
    "asb-showgrounds",
    "nz",
    "ASB Showgrounds",
    "217 Green Lane West, Epsom, Auckland, New Zealand",
    -36.9098,
    174.7247,
    ["asb showgrounds", "due drop events centre", "armageddon expo"]
  ),

  // 🇦🇪 🇿🇦 🇷🇺
  v(
    "dubai-wtc",
    "ae",
    "Dubai World Trade Centre",
    "Sheikh Zayed Rd, Dubai, United Arab Emirates",
    25.2233,
    55.2867,
    ["dubai world trade centre", "dubai wtc", "mefcc"]
  ),
  v(
    "sandton-convention",
    "za",
    "Sandton Convention Centre",
    "161 Maude St, Sandton, Johannesburg, South Africa",
    -26.1076,
    28.0567,
    ["sandton convention centre", "comic con africa"]
  ),
  v(
    "crocus-expo",
    "ru",
    "Crocus Expo",
    "65-66 km MKAD, Moscow, Russia",
    55.8233,
    37.3906,
    ["crocus expo", "comic con russia"]
  ),
];

const MASTER_BY_ID = new Map(SUBCULTURE_VENUE_MASTER.map((m) => [m.id, m]));

/** 발음·대소문자·기호 무시 정규화 */
export function normalizeVenueMatchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\uac00-\ud7a3\u3040-\u30ff\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasMatches(haystack: string, alias: string): boolean {
  const a = normalizeVenueMatchText(alias);
  if (a.length < 3) return false;
  return haystack.includes(a);
}

function matchVenueInList(
  venues: MasterVenue[],
  haystack: string
): MasterVenue | null {
  let best: MasterVenue | null = null;
  let bestLen = 0;
  for (const venue of venues) {
    for (const alias of venue.aliases) {
      if (aliasMatches(haystack, alias) && alias.length > bestLen) {
        best = venue;
        bestLen = alias.length;
      }
    }
    const canonical = normalizeVenueMatchText(venue.venueName);
    if (canonical.length >= 4 && haystack.includes(canonical) && canonical.length > bestLen) {
      best = venue;
      bestLen = canonical.length;
    }
  }
  return best;
}

/** 행사장명·주소에서 마스터 DB 매칭 — 국가 일치 우선, 없으면 전역 검색 */
export function resolveMasterVenue(
  country: SubcultureEventCountry,
  venueName: string | null | undefined,
  address?: string | null
): MasterVenue | null {
  const haystack = normalizeVenueMatchText(
    [venueName, address].filter(Boolean).join(" ")
  );
  if (haystack.length < 3) return null;

  if (country !== "other") {
    const inCountry = SUBCULTURE_VENUE_MASTER.filter((v) => v.country === country);
    const hit = matchVenueInList(inCountry, haystack);
    if (hit) return hit;
  }

  return matchVenueInList(SUBCULTURE_VENUE_MASTER, haystack);
}

export function getMasterVenueById(id: string): MasterVenue | null {
  return MASTER_BY_ID.get(id) ?? null;
}

export type ResolvedVenueCoords = {
  lat: number;
  lng: number;
  venueName: string;
  address: string;
  masterVenueId: string;
};

/** 마스터 DB → 좌표 DTO */
export function masterVenueToCoords(venue: MasterVenue): ResolvedVenueCoords {
  return {
    lat: venue.lat,
    lng: venue.lng,
    venueName: venue.venueName,
    address: venue.address,
    masterVenueId: venue.id,
  };
}
