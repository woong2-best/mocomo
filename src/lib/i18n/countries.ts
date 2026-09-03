import {
  filterOfacAllowedCountries,
  isOfacSanctionedCountry,
} from "@/lib/compliance/ofac-sanctioned-countries";
import type { Locale } from "@/lib/i18n/config";

export type CountryLocale = Locale;

export type CountryEntry = {
  code: string;
  nameKo: string;
  nameEn: string;
};

export type CountryRegion = {
  id: string;
  labelKo: string;
  labelEn: string;
  labelJa: string;
  labelZh: string;
  countries: CountryEntry[];
};

const INTL_REGION = new Map<string, Intl.DisplayNames>();

function intlRegionName(code: string, locale: string): string | undefined {
  const tag =
    locale === "zh"
      ? "zh-Hans"
      : locale === "zh-TW"
        ? "zh-Hant"
        : locale.split("-")[0] ?? locale;
  let display = INTL_REGION.get(tag);
  if (!display) {
    try {
      display = new Intl.DisplayNames([tag], { type: "region" });
      INTL_REGION.set(tag, display);
    } catch {
      return undefined;
    }
  }
  return display.of(code.toUpperCase()) ?? undefined;
}

const asia: CountryEntry[] = [
  { code: "AF", nameKo: "아프가니스탄", nameEn: "Afghanistan" },
  { code: "AM", nameKo: "아르메니아", nameEn: "Armenia" },
  { code: "AZ", nameKo: "아제르바이잔", nameEn: "Azerbaijan" },
  { code: "BH", nameKo: "바레인", nameEn: "Bahrain" },
  { code: "BD", nameKo: "방글라데시", nameEn: "Bangladesh" },
  { code: "BT", nameKo: "부탄", nameEn: "Bhutan" },
  { code: "BN", nameKo: "브루나이", nameEn: "Brunei" },
  { code: "KH", nameKo: "캄보디아", nameEn: "Cambodia" },
  { code: "CN", nameKo: "중국", nameEn: "China" },
  { code: "CY", nameKo: "키프로스", nameEn: "Cyprus" },
  { code: "GE", nameKo: "조지아", nameEn: "Georgia" },
  { code: "IN", nameKo: "인도", nameEn: "India" },
  { code: "ID", nameKo: "인도네시아", nameEn: "Indonesia" },
  { code: "IR", nameKo: "이란", nameEn: "Iran" },
  { code: "IQ", nameKo: "이라크", nameEn: "Iraq" },
  { code: "IL", nameKo: "이스라엘", nameEn: "Israel" },
  { code: "JP", nameKo: "일본", nameEn: "Japan" },
  { code: "JO", nameKo: "요르단", nameEn: "Jordan" },
  { code: "KZ", nameKo: "카자흐스탄", nameEn: "Kazakhstan" },
  { code: "KW", nameKo: "쿠웨이트", nameEn: "Kuwait" },
  { code: "KG", nameKo: "키르기스스탄", nameEn: "Kyrgyzstan" },
  { code: "LA", nameKo: "라오스", nameEn: "Laos" },
  { code: "LB", nameKo: "레바논", nameEn: "Lebanon" },
  { code: "MY", nameKo: "말레이시아", nameEn: "Malaysia" },
  { code: "MV", nameKo: "몰디브", nameEn: "Maldives" },
  { code: "MN", nameKo: "몽골", nameEn: "Mongolia" },
  { code: "MM", nameKo: "미얀마", nameEn: "Myanmar" },
  { code: "NP", nameKo: "네팔", nameEn: "Nepal" },
  { code: "OM", nameKo: "오만", nameEn: "Oman" },
  { code: "PK", nameKo: "파키스탄", nameEn: "Pakistan" },
  { code: "PS", nameKo: "팔레스타인", nameEn: "Palestine" },
  { code: "PH", nameKo: "필리핀", nameEn: "Philippines" },
  { code: "QA", nameKo: "카타르", nameEn: "Qatar" },
  { code: "SA", nameKo: "사우디아라비아", nameEn: "Saudi Arabia" },
  { code: "SG", nameKo: "싱가포르", nameEn: "Singapore" },
  { code: "KR", nameKo: "대한민국", nameEn: "South Korea" },
  { code: "LK", nameKo: "스리랑카", nameEn: "Sri Lanka" },
  { code: "SY", nameKo: "시리아", nameEn: "Syria" },
  { code: "TJ", nameKo: "타지키스탄", nameEn: "Tajikistan" },
  { code: "TH", nameKo: "태국", nameEn: "Thailand" },
  { code: "TL", nameKo: "동티모르", nameEn: "Timor-Leste" },
  { code: "TR", nameKo: "튀르키예", nameEn: "Türkiye" },
  { code: "TM", nameKo: "투르크메니스탄", nameEn: "Turkmenistan" },
  { code: "AE", nameKo: "아랍에미리트", nameEn: "United Arab Emirates" },
  { code: "UZ", nameKo: "우즈베키스탄", nameEn: "Uzbekistan" },
  { code: "VN", nameKo: "베트남", nameEn: "Vietnam" },
  { code: "YE", nameKo: "예멘", nameEn: "Yemen" },
];

const europe: CountryEntry[] = [
  { code: "AL", nameKo: "알바니아", nameEn: "Albania" },
  { code: "AD", nameKo: "안도라", nameEn: "Andorra" },
  { code: "AT", nameKo: "오스트리아", nameEn: "Austria" },
  { code: "BY", nameKo: "벨라루스", nameEn: "Belarus" },
  { code: "BE", nameKo: "벨기에", nameEn: "Belgium" },
  { code: "BA", nameKo: "보스니아 헤르체고비나", nameEn: "Bosnia and Herzegovina" },
  { code: "BG", nameKo: "불가리아", nameEn: "Bulgaria" },
  { code: "HR", nameKo: "크로아티아", nameEn: "Croatia" },
  { code: "CZ", nameKo: "체코", nameEn: "Czechia" },
  { code: "DK", nameKo: "덴마크", nameEn: "Denmark" },
  { code: "EE", nameKo: "에스토니아", nameEn: "Estonia" },
  { code: "FI", nameKo: "핀란드", nameEn: "Finland" },
  { code: "FR", nameKo: "프랑스", nameEn: "France" },
  { code: "DE", nameKo: "독일", nameEn: "Germany" },
  { code: "GR", nameKo: "그리스", nameEn: "Greece" },
  { code: "HU", nameKo: "헝가리", nameEn: "Hungary" },
  { code: "IS", nameKo: "아이슬란드", nameEn: "Iceland" },
  { code: "IE", nameKo: "아일랜드", nameEn: "Ireland" },
  { code: "IT", nameKo: "이탈리아", nameEn: "Italy" },
  { code: "XK", nameKo: "코소보", nameEn: "Kosovo" },
  { code: "LV", nameKo: "라트비아", nameEn: "Latvia" },
  { code: "LI", nameKo: "리히텐슈타인", nameEn: "Liechtenstein" },
  { code: "LT", nameKo: "리투아니아", nameEn: "Lithuania" },
  { code: "LU", nameKo: "룩셈부르크", nameEn: "Luxembourg" },
  { code: "MT", nameKo: "몰타", nameEn: "Malta" },
  { code: "MD", nameKo: "몰도바", nameEn: "Moldova" },
  { code: "MC", nameKo: "모나코", nameEn: "Monaco" },
  { code: "ME", nameKo: "몬테네그로", nameEn: "Montenegro" },
  { code: "NL", nameKo: "네덜란드", nameEn: "Netherlands" },
  { code: "MK", nameKo: "북마케도니아", nameEn: "North Macedonia" },
  { code: "NO", nameKo: "노르웨이", nameEn: "Norway" },
  { code: "PL", nameKo: "폴란드", nameEn: "Poland" },
  { code: "PT", nameKo: "포르투갈", nameEn: "Portugal" },
  { code: "RO", nameKo: "루마니아", nameEn: "Romania" },
  { code: "RU", nameKo: "러시아", nameEn: "Russia" },
  { code: "SM", nameKo: "산마리노", nameEn: "San Marino" },
  { code: "RS", nameKo: "세르비아", nameEn: "Serbia" },
  { code: "SK", nameKo: "슬로바키아", nameEn: "Slovakia" },
  { code: "SI", nameKo: "슬로베니아", nameEn: "Slovenia" },
  { code: "ES", nameKo: "스페인", nameEn: "Spain" },
  { code: "SE", nameKo: "스웨덴", nameEn: "Sweden" },
  { code: "CH", nameKo: "스위스", nameEn: "Switzerland" },
  { code: "UA", nameKo: "우크라이나", nameEn: "Ukraine" },
  { code: "GB", nameKo: "영국", nameEn: "United Kingdom" },
  { code: "VA", nameKo: "바티칸 시국", nameEn: "Vatican City" },
];

const africa: CountryEntry[] = [
  { code: "DZ", nameKo: "알제리", nameEn: "Algeria" },
  { code: "AO", nameKo: "앙골라", nameEn: "Angola" },
  { code: "BJ", nameKo: "베냉", nameEn: "Benin" },
  { code: "BW", nameKo: "보츠와나", nameEn: "Botswana" },
  { code: "BF", nameKo: "부르키나파소", nameEn: "Burkina Faso" },
  { code: "BI", nameKo: "부룬디", nameEn: "Burundi" },
  { code: "CV", nameKo: "보베르데", nameEn: "Cape Verde" },
  { code: "CM", nameKo: "카메룬", nameEn: "Cameroon" },
  { code: "CF", nameKo: "중앙아프리카공화국", nameEn: "Central African Republic" },
  { code: "TD", nameKo: "차드", nameEn: "Chad" },
  { code: "KM", nameKo: "코모로", nameEn: "Comoros" },
  { code: "CG", nameKo: "콩고공화국", nameEn: "Republic of the Congo" },
  { code: "CD", nameKo: "콩고민주공화국", nameEn: "Democratic Republic of the Congo" },
  { code: "DJ", nameKo: "지부티", nameEn: "Djibouti" },
  { code: "EG", nameKo: "이집트", nameEn: "Egypt" },
  { code: "GQ", nameKo: "적도기니", nameEn: "Equatorial Guinea" },
  { code: "ER", nameKo: "에리트레아", nameEn: "Eritrea" },
  { code: "SZ", nameKo: "에스와티니", nameEn: "Eswatini" },
  { code: "ET", nameKo: "에티오피아", nameEn: "Ethiopia" },
  { code: "GA", nameKo: "가봉", nameEn: "Gabon" },
  { code: "GM", nameKo: "감비아", nameEn: "Gambia" },
  { code: "GH", nameKo: "가나", nameEn: "Ghana" },
  { code: "GN", nameKo: "기니", nameEn: "Guinea" },
  { code: "GW", nameKo: "기니비사우", nameEn: "Guinea-Bissau" },
  { code: "CI", nameKo: "코트디부아르", nameEn: "Ivory Coast" },
  { code: "KE", nameKo: "케냐", nameEn: "Kenya" },
  { code: "LS", nameKo: "레소토", nameEn: "Lesotho" },
  { code: "LR", nameKo: "라이베리아", nameEn: "Liberia" },
  { code: "LY", nameKo: "리비아", nameEn: "Libya" },
  { code: "MG", nameKo: "마다가스카르", nameEn: "Madagascar" },
  { code: "MW", nameKo: "말라위", nameEn: "Malawi" },
  { code: "ML", nameKo: "말리", nameEn: "Mali" },
  { code: "MR", nameKo: "모리타니", nameEn: "Mauritania" },
  { code: "MU", nameKo: "모리셔스", nameEn: "Mauritius" },
  { code: "MA", nameKo: "모로코", nameEn: "Morocco" },
  { code: "MZ", nameKo: "모잠비크", nameEn: "Mozambique" },
  { code: "NA", nameKo: "나미비아", nameEn: "Namibia" },
  { code: "NE", nameKo: "니제르", nameEn: "Niger" },
  { code: "NG", nameKo: "나이지리아", nameEn: "Nigeria" },
  { code: "RW", nameKo: "르완다", nameEn: "Rwanda" },
  { code: "ST", nameKo: "상투메 프린시페", nameEn: "São Tomé and Príncipe" },
  { code: "SN", nameKo: "세네갈", nameEn: "Senegal" },
  { code: "SC", nameKo: "세이셸", nameEn: "Seychelles" },
  { code: "SL", nameKo: "시에라리온", nameEn: "Sierra Leone" },
  { code: "SO", nameKo: "소말리아", nameEn: "Somalia" },
  { code: "ZA", nameKo: "남아프리카공화국", nameEn: "South Africa" },
  { code: "SS", nameKo: "남수단", nameEn: "South Sudan" },
  { code: "SD", nameKo: "수단", nameEn: "Sudan" },
  { code: "TZ", nameKo: "탄자니아", nameEn: "Tanzania" },
  { code: "TG", nameKo: "토고", nameEn: "Togo" },
  { code: "TN", nameKo: "튀니지", nameEn: "Tunisia" },
  { code: "UG", nameKo: "우간다", nameEn: "Uganda" },
  { code: "ZM", nameKo: "잠비아", nameEn: "Zambia" },
  { code: "ZW", nameKo: "짐바브웨", nameEn: "Zimbabwe" },
];

const northAmerica: CountryEntry[] = [
  { code: "AG", nameKo: "앤티가 바부다", nameEn: "Antigua and Barbuda" },
  { code: "BS", nameKo: "바하마", nameEn: "Bahamas" },
  { code: "BB", nameKo: "바베이도스", nameEn: "Barbados" },
  { code: "BZ", nameKo: "벨리즈", nameEn: "Belize" },
  { code: "CA", nameKo: "캐나다", nameEn: "Canada" },
  { code: "CR", nameKo: "코스타리카", nameEn: "Costa Rica" },
  { code: "CU", nameKo: "쿠바", nameEn: "Cuba" },
  { code: "DM", nameKo: "도미니카", nameEn: "Dominica" },
  { code: "DO", nameKo: "도미니카공화국", nameEn: "Dominican Republic" },
  { code: "SV", nameKo: "엘살바도르", nameEn: "El Salvador" },
  { code: "GD", nameKo: "그레나다", nameEn: "Grenada" },
  { code: "GT", nameKo: "과테말라", nameEn: "Guatemala" },
  { code: "HT", nameKo: "아이티", nameEn: "Haiti" },
  { code: "HN", nameKo: "온두라스", nameEn: "Honduras" },
  { code: "JM", nameKo: "자메이카", nameEn: "Jamaica" },
  { code: "MX", nameKo: "멕시코", nameEn: "Mexico" },
  { code: "NI", nameKo: "니카라과", nameEn: "Nicaragua" },
  { code: "PA", nameKo: "파나마", nameEn: "Panama" },
  { code: "KN", nameKo: "세인트키츠 네비스", nameEn: "Saint Kitts and Nevis" },
  { code: "LC", nameKo: "세인트루시아", nameEn: "Saint Lucia" },
  { code: "VC", nameKo: "세인트빈센트 그레나딘", nameEn: "Saint Vincent and the Grenadines" },
  { code: "TT", nameKo: "트리니다드 토바고", nameEn: "Trinidad and Tobago" },
  { code: "US", nameKo: "미국", nameEn: "United States" },
];

const southAmerica: CountryEntry[] = [
  { code: "AR", nameKo: "아르헨티나", nameEn: "Argentina" },
  { code: "BO", nameKo: "볼리비아", nameEn: "Bolivia" },
  { code: "BR", nameKo: "브라질", nameEn: "Brazil" },
  { code: "CL", nameKo: "칠레", nameEn: "Chile" },
  { code: "CO", nameKo: "콜롬비아", nameEn: "Colombia" },
  { code: "EC", nameKo: "에콰도르", nameEn: "Ecuador" },
  { code: "GY", nameKo: "가이아나", nameEn: "Guyana" },
  { code: "PY", nameKo: "파라과이", nameEn: "Paraguay" },
  { code: "PE", nameKo: "페루", nameEn: "Peru" },
  { code: "SR", nameKo: "수리남", nameEn: "Suriname" },
  { code: "UY", nameKo: "우루과이", nameEn: "Uruguay" },
  { code: "VE", nameKo: "베네수엘라", nameEn: "Venezuela" },
];

const oceania: CountryEntry[] = [
  { code: "AU", nameKo: "호주", nameEn: "Australia" },
  { code: "FJ", nameKo: "피지", nameEn: "Fiji" },
  { code: "KI", nameKo: "키리바시", nameEn: "Kiribati" },
  { code: "MH", nameKo: "마셜제도", nameEn: "Marshall Islands" },
  { code: "FM", nameKo: "미크로네시아", nameEn: "Micronesia" },
  { code: "NR", nameKo: "나우루", nameEn: "Nauru" },
  { code: "NZ", nameKo: "뉴질랜드", nameEn: "New Zealand" },
  { code: "PW", nameKo: "팔라우", nameEn: "Palau" },
  { code: "PG", nameKo: "파푸아뉴기니", nameEn: "Papua New Guinea" },
  { code: "WS", nameKo: "사모아", nameEn: "Samoa" },
  { code: "SB", nameKo: "솔로몬제도", nameEn: "Solomon Islands" },
  { code: "TO", nameKo: "통가", nameEn: "Tonga" },
  { code: "TV", nameKo: "투발루", nameEn: "Tuvalu" },
  { code: "VU", nameKo: "바누아투", nameEn: "Vanuatu" },
];

/** 기존 계정 호환 */
const legacy: CountryEntry[] = [
  { code: "TW", nameKo: "대만", nameEn: "Taiwan" },
  { code: "OTHER", nameKo: "기타", nameEn: "Other" },
];

export const COUNTRY_REGIONS: CountryRegion[] = [
  {
    id: "asia",
    labelKo: "아시아",
    labelEn: "Asia",
    labelJa: "アジア",
    labelZh: "亚洲",
    countries: asia,
  },
  {
    id: "europe",
    labelKo: "유럽",
    labelEn: "Europe",
    labelJa: "ヨーロッパ",
    labelZh: "欧洲",
    countries: europe,
  },
  {
    id: "africa",
    labelKo: "아프리카",
    labelEn: "Africa",
    labelJa: "アフリカ",
    labelZh: "非洲",
    countries: africa,
  },
  {
    id: "north-america",
    labelKo: "북아메리카",
    labelEn: "North America",
    labelJa: "北アメリカ",
    labelZh: "北美洲",
    countries: northAmerica,
  },
  {
    id: "south-america",
    labelKo: "남아메리카",
    labelEn: "South America",
    labelJa: "南アメリカ",
    labelZh: "南美洲",
    countries: southAmerica,
  },
  {
    id: "oceania",
    labelKo: "오세아니아",
    labelEn: "Oceania",
    labelJa: "オセアニア",
    labelZh: "大洋洲",
    countries: oceania,
  },
  {
    id: "other",
    labelKo: "기타",
    labelEn: "Other",
    labelJa: "その他",
    labelZh: "其他",
    countries: legacy,
  },
];

/** OFAC 제재 국가 제외 — 회원가입·설정 국가 선택용 */
export const ALLOWED_COUNTRY_REGIONS: CountryRegion[] = COUNTRY_REGIONS.map((region) => ({
  ...region,
  countries: filterOfacAllowedCountries(region.countries),
})).filter((region) => region.countries.length > 0);

export const ALLOWED_COUNTRIES: CountryEntry[] = ALLOWED_COUNTRY_REGIONS.flatMap(
  (r) => r.countries
);

export const COUNTRIES: CountryEntry[] = COUNTRY_REGIONS.flatMap((r) => r.countries);

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryDisplayName(code: string, locale: CountryLocale): string {
  const upper = code.toUpperCase();
  const c = COUNTRY_BY_CODE.get(upper);
  if (!c) return code;
  if (locale === "ko") return c.nameKo;
  if (locale === "en") return c.nameEn;
  if (upper === "OTHER") {
    if (locale === "ja") return "その他";
    if (locale === "zh" || locale === "zh-TW") return locale === "zh-TW" ? "其他" : "其他";
    return intlRegionName(upper, locale) ?? c.nameEn;
  }
  return intlRegionName(upper, locale) ?? c.nameEn;
}

export function isKnownCountryCode(code: string): boolean {
  return COUNTRY_BY_CODE.has(code.toUpperCase());
}

export function isSelectableCountryCode(code: string): boolean {
  return isKnownCountryCode(code) && !isOfacSanctionedCountry(code);
}

export function regionLabel(region: CountryRegion, locale: CountryLocale): string {
  if (locale === "ko") return region.labelKo;
  if (locale === "ja") return region.labelJa;
  if (locale === "zh" || locale === "zh-TW") return region.labelZh;
  return region.labelEn;
}
