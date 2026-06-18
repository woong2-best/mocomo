/** ISO 3166-1 alpha-2 — 전 세계 국가 (대표 좌표) */
export type WorldCountry = {
  code: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
};

export const WORLD_COUNTRIES: WorldCountry[] = [
  { code: "AF", nameKo: "아프가니스탄", nameEn: "Afghanistan", lat: 33.9391, lng: 67.71 },
  { code: "AL", nameKo: "알바니아", nameEn: "Albania", lat: 41.1533, lng: 20.1683 },
  { code: "DZ", nameKo: "알제리", nameEn: "Algeria", lat: 28.0339, lng: 1.6596 },
  { code: "AD", nameKo: "안도라", nameEn: "Andorra", lat: 42.5063, lng: 1.5218 },
  { code: "AO", nameKo: "앙골라", nameEn: "Angola", lat: -11.2027, lng: 17.8739 },
  { code: "AR", nameKo: "아르헨티나", nameEn: "Argentina", lat: -38.4161, lng: -63.6167 },
  { code: "AM", nameKo: "아르메니아", nameEn: "Armenia", lat: 40.0691, lng: 45.0382 },
  { code: "AU", nameKo: "호주", nameEn: "Australia", lat: -25.2744, lng: 133.7751 },
  { code: "AT", nameKo: "오스트리아", nameEn: "Austria", lat: 47.5162, lng: 14.5501 },
  { code: "AZ", nameKo: "아제르바이잔", nameEn: "Azerbaijan", lat: 40.1431, lng: 47.5769 },
  { code: "BH", nameKo: "바레인", nameEn: "Bahrain", lat: 26.0667, lng: 50.5577 },
  { code: "BD", nameKo: "방글라데시", nameEn: "Bangladesh", lat: 23.685, lng: 90.3563 },
  { code: "BY", nameKo: "벨라루스", nameEn: "Belarus", lat: 53.7098, lng: 27.9534 },
  { code: "BE", nameKo: "벨기에", nameEn: "Belgium", lat: 50.5039, lng: 4.4699 },
  { code: "BZ", nameKo: "벨리즈", nameEn: "Belize", lat: 17.1899, lng: -88.4976 },
  { code: "BJ", nameKo: "베냉", nameEn: "Benin", lat: 9.3077, lng: 2.3158 },
  { code: "BT", nameKo: "부탄", nameEn: "Bhutan", lat: 27.5142, lng: 90.4336 },
  { code: "BO", nameKo: "볼리비아", nameEn: "Bolivia", lat: -16.2902, lng: -63.5887 },
  { code: "BA", nameKo: "보스니아", nameEn: "Bosnia and Herzegovina", lat: 43.9159, lng: 17.6791 },
  { code: "BW", nameKo: "보츠와나", nameEn: "Botswana", lat: -22.3285, lng: 24.6849 },
  { code: "BR", nameKo: "브라질", nameEn: "Brazil", lat: -14.235, lng: -51.9253 },
  { code: "BN", nameKo: "브루나이", nameEn: "Brunei", lat: 4.5353, lng: 114.7277 },
  { code: "BG", nameKo: "불가리아", nameEn: "Bulgaria", lat: 42.7339, lng: 25.4858 },
  { code: "KH", nameKo: "캄보디아", nameEn: "Cambodia", lat: 12.5657, lng: 104.991 },
  { code: "CM", nameKo: "카메룬", nameEn: "Cameroon", lat: 7.3697, lng: 12.3547 },
  { code: "CA", nameKo: "캐나다", nameEn: "Canada", lat: 56.1304, lng: -106.3468 },
  { code: "CL", nameKo: "칠레", nameEn: "Chile", lat: -35.6751, lng: -71.543 },
  { code: "CN", nameKo: "중국", nameEn: "China", lat: 35.8617, lng: 104.1954 },
  { code: "CO", nameKo: "콜롬비아", nameEn: "Colombia", lat: 4.5709, lng: -74.2973 },
  { code: "CR", nameKo: "코스타리카", nameEn: "Costa Rica", lat: 9.7489, lng: -83.7534 },
  { code: "HR", nameKo: "크로아티아", nameEn: "Croatia", lat: 45.1, lng: 15.2 },
  { code: "CU", nameKo: "쿠바", nameEn: "Cuba", lat: 21.5218, lng: -77.7812 },
  { code: "CY", nameKo: "키프로스", nameEn: "Cyprus", lat: 35.1264, lng: 33.4299 },
  { code: "CZ", nameKo: "체코", nameEn: "Czechia", lat: 49.8175, lng: 15.473 },
  { code: "DK", nameKo: "덴마크", nameEn: "Denmark", lat: 56.2639, lng: 9.5018 },
  { code: "EC", nameKo: "에콰도르", nameEn: "Ecuador", lat: -1.8312, lng: -78.1834 },
  { code: "EG", nameKo: "이집트", nameEn: "Egypt", lat: 26.8206, lng: 30.8025 },
  { code: "EE", nameKo: "에스토니아", nameEn: "Estonia", lat: 58.5953, lng: 25.0136 },
  { code: "ET", nameKo: "에티오피아", nameEn: "Ethiopia", lat: 9.145, lng: 40.4897 },
  { code: "FI", nameKo: "핀란드", nameEn: "Finland", lat: 61.9241, lng: 25.7482 },
  { code: "FR", nameKo: "프랑스", nameEn: "France", lat: 46.2276, lng: 2.2137 },
  { code: "DE", nameKo: "독일", nameEn: "Germany", lat: 51.1657, lng: 10.4515 },
  { code: "GH", nameKo: "가나", nameEn: "Ghana", lat: 7.9465, lng: -1.0232 },
  { code: "GR", nameKo: "그리스", nameEn: "Greece", lat: 39.0742, lng: 21.8243 },
  { code: "GT", nameKo: "과테말라", nameEn: "Guatemala", lat: 15.7835, lng: -90.2308 },
  { code: "HN", nameKo: "온두라스", nameEn: "Honduras", lat: 15.2, lng: -86.2419 },
  { code: "HK", nameKo: "홍콩", nameEn: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { code: "HU", nameKo: "헝가리", nameEn: "Hungary", lat: 47.1625, lng: 19.5033 },
  { code: "IS", nameKo: "아이슬란드", nameEn: "Iceland", lat: 64.9631, lng: -19.0208 },
  { code: "IN", nameKo: "인도", nameEn: "India", lat: 20.5937, lng: 78.9629 },
  { code: "ID", nameKo: "인도네시아", nameEn: "Indonesia", lat: -0.7893, lng: 113.9213 },
  { code: "IR", nameKo: "이란", nameEn: "Iran", lat: 32.4279, lng: 53.688 },
  { code: "IQ", nameKo: "이라크", nameEn: "Iraq", lat: 33.2232, lng: 43.6793 },
  { code: "IE", nameKo: "아일랜드", nameEn: "Ireland", lat: 53.4129, lng: -8.2439 },
  { code: "IL", nameKo: "이스라엘", nameEn: "Israel", lat: 31.0461, lng: 34.8516 },
  { code: "IT", nameKo: "이탈리아", nameEn: "Italy", lat: 41.8719, lng: 12.5674 },
  { code: "JM", nameKo: "자메이카", nameEn: "Jamaica", lat: 18.1096, lng: -77.2975 },
  { code: "JP", nameKo: "일본", nameEn: "Japan", lat: 36.2048, lng: 138.2529 },
  { code: "JO", nameKo: "요르단", nameEn: "Jordan", lat: 30.5852, lng: 36.2384 },
  { code: "KZ", nameKo: "카자흐스탄", nameEn: "Kazakhstan", lat: 48.0196, lng: 66.9237 },
  { code: "KE", nameKo: "케냐", nameEn: "Kenya", lat: -0.0236, lng: 37.9062 },
  { code: "KR", nameKo: "대한민국", nameEn: "South Korea", lat: 36.5, lng: 127.5 },
  { code: "KW", nameKo: "쿠웨이트", nameEn: "Kuwait", lat: 29.3117, lng: 47.4818 },
  { code: "KG", nameKo: "키르기스스탄", nameEn: "Kyrgyzstan", lat: 41.2044, lng: 74.7661 },
  { code: "LA", nameKo: "라오스", nameEn: "Laos", lat: 19.8563, lng: 102.4955 },
  { code: "LV", nameKo: "라트비아", nameEn: "Latvia", lat: 56.8796, lng: 24.6032 },
  { code: "LB", nameKo: "레바논", nameEn: "Lebanon", lat: 33.8547, lng: 35.8623 },
  { code: "LY", nameKo: "리비아", nameEn: "Libya", lat: 26.3351, lng: 17.2283 },
  { code: "LT", nameKo: "리투아니아", nameEn: "Lithuania", lat: 55.1694, lng: 23.8813 },
  { code: "LU", nameKo: "룩셈부르크", nameEn: "Luxembourg", lat: 49.8153, lng: 6.1296 },
  { code: "MO", nameKo: "마카오", nameEn: "Macao", lat: 22.1987, lng: 113.5439 },
  { code: "MY", nameKo: "말레이시아", nameEn: "Malaysia", lat: 4.2105, lng: 101.9758 },
  { code: "MX", nameKo: "멕시코", nameEn: "Mexico", lat: 23.6345, lng: -102.5528 },
  { code: "MN", nameKo: "몽골", nameEn: "Mongolia", lat: 46.8625, lng: 103.8467 },
  { code: "MA", nameKo: "모로코", nameEn: "Morocco", lat: 31.7917, lng: -7.0926 },
  { code: "MM", nameKo: "미얀마", nameEn: "Myanmar", lat: 21.9162, lng: 95.956 },
  { code: "NP", nameKo: "네팔", nameEn: "Nepal", lat: 28.3949, lng: 84.124 },
  { code: "NL", nameKo: "네덜란드", nameEn: "Netherlands", lat: 52.1326, lng: 5.2913 },
  { code: "NZ", nameKo: "뉴질랜드", nameEn: "New Zealand", lat: -40.9006, lng: 174.886 },
  { code: "NG", nameKo: "나이지리아", nameEn: "Nigeria", lat: 9.082, lng: 8.6753 },
  { code: "NO", nameKo: "노르웨이", nameEn: "Norway", lat: 60.472, lng: 8.4689 },
  { code: "OM", nameKo: "오만", nameEn: "Oman", lat: 21.4735, lng: 55.9754 },
  { code: "PK", nameKo: "파키스탄", nameEn: "Pakistan", lat: 30.3753, lng: 69.3451 },
  { code: "PA", nameKo: "파나마", nameEn: "Panama", lat: 8.538, lng: -80.7821 },
  { code: "PY", nameKo: "파라과이", nameEn: "Paraguay", lat: -23.4425, lng: -58.4438 },
  { code: "PE", nameKo: "페루", nameEn: "Peru", lat: -9.19, lng: -75.0152 },
  { code: "PH", nameKo: "필리핀", nameEn: "Philippines", lat: 12.8797, lng: 121.774 },
  { code: "PL", nameKo: "폴란드", nameEn: "Poland", lat: 51.9194, lng: 19.1451 },
  { code: "PT", nameKo: "포르투갈", nameEn: "Portugal", lat: 39.3999, lng: -8.2245 },
  { code: "QA", nameKo: "카타르", nameEn: "Qatar", lat: 25.3548, lng: 51.1839 },
  { code: "RO", nameKo: "루마니아", nameEn: "Romania", lat: 45.9432, lng: 24.9668 },
  { code: "RU", nameKo: "러시아", nameEn: "Russia", lat: 61.524, lng: 105.3188 },
  { code: "SA", nameKo: "사우디아라비아", nameEn: "Saudi Arabia", lat: 23.8859, lng: 45.0792 },
  { code: "RS", nameKo: "세르비아", nameEn: "Serbia", lat: 44.0165, lng: 21.0059 },
  { code: "SG", nameKo: "싱가포르", nameEn: "Singapore", lat: 1.3521, lng: 103.8198 },
  { code: "SK", nameKo: "슬로바키아", nameEn: "Slovakia", lat: 48.669, lng: 19.699 },
  { code: "SI", nameKo: "슬로베니아", nameEn: "Slovenia", lat: 46.1512, lng: 14.9955 },
  { code: "ZA", nameKo: "남아프리카", nameEn: "South Africa", lat: -30.5595, lng: 22.9375 },
  { code: "ES", nameKo: "스페인", nameEn: "Spain", lat: 40.4637, lng: -3.7492 },
  { code: "LK", nameKo: "스리랑카", nameEn: "Sri Lanka", lat: 7.8731, lng: 80.7718 },
  { code: "SE", nameKo: "스웨덴", nameEn: "Sweden", lat: 60.1282, lng: 18.6435 },
  { code: "CH", nameKo: "스위스", nameEn: "Switzerland", lat: 46.8182, lng: 8.2275 },
  { code: "TW", nameKo: "대만", nameEn: "Taiwan", lat: 23.6978, lng: 120.9605 },
  { code: "TH", nameKo: "태국", nameEn: "Thailand", lat: 15.87, lng: 100.9925 },
  { code: "TR", nameKo: "튀르키예", nameEn: "Turkey", lat: 38.9637, lng: 35.2433 },
  { code: "UA", nameKo: "우크라이나", nameEn: "Ukraine", lat: 48.3794, lng: 31.1656 },
  { code: "AE", nameKo: "아랍에미리트", nameEn: "United Arab Emirates", lat: 23.4241, lng: 53.8478 },
  { code: "GB", nameKo: "영국", nameEn: "United Kingdom", lat: 55.3781, lng: -3.436 },
  { code: "US", nameKo: "미국", nameEn: "United States", lat: 37.0902, lng: -95.7129 },
  { code: "UY", nameKo: "우루과이", nameEn: "Uruguay", lat: -32.5228, lng: -55.7658 },
  { code: "UZ", nameKo: "우즈베키스탄", nameEn: "Uzbekistan", lat: 41.3775, lng: 64.5853 },
  { code: "VE", nameKo: "베네수엘라", nameEn: "Venezuela", lat: 6.4238, lng: -66.5897 },
  { code: "VN", nameKo: "베트남", nameEn: "Vietnam", lat: 14.0583, lng: 108.2772 },
  { code: "YE", nameKo: "예멘", nameEn: "Yemen", lat: 15.5527, lng: 48.5164 },
];

export function findCountry(code: string): WorldCountry | undefined {
  const c = code.toUpperCase();
  return WORLD_COUNTRIES.find((x) => x.code === c);
}

export function nearestCountry(lat: number, lng: number): WorldCountry {
  let best = WORLD_COUNTRIES[0];
  let bestD = Infinity;
  for (const c of WORLD_COUNTRIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
