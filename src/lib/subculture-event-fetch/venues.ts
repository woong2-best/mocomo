type Venue = {
  lat: number;
  lng: number;
  address: string;
  venueName: string;
};

export const VENUES: Record<string, Venue> = {
  kintex: {
    lat: 37.5273,
    lng: 126.6154,
    venueName: "킨텍스 제1전시장",
    address: "경기 고양시 일산서구 킨텍스로 217-60",
  },
  kintex2: {
    lat: 37.5278,
    lng: 126.6182,
    venueName: "킨텍스 제2전시장",
    address: "경기 고양시 일산서구 킨텍스로 217-60",
  },
  coex: {
    lat: 37.5115,
    lng: 127.0602,
    venueName: "코엑스",
    address: "서울 강남구 영동대로 513",
  },
  bexco: {
    lat: 35.1689,
    lng: 129.1362,
    venueName: "벡스코",
    address: "부산 해운대구 APEC로 55",
  },
  setec: {
    lat: 37.4842,
    lng: 127.0346,
    venueName: "SETEC",
    address: "서울 강남구 남부순환로 3104",
  },
  tokyo_big_sight: {
    lat: 35.6312,
    lng: 139.7967,
    venueName: "東京ビッグサイト",
    address: "東京都江東区有明3-11-1",
  },
  makuhari: {
    lat: 35.6481,
    lng: 140.0347,
    venueName: "幕張メッセ",
    address: "千葉県千葉市美浜区中瀬2-1",
  },
  kyoto_miyako: {
    lat: 35.0178,
    lng: 135.7815,
    venueName: "みやこめっせ",
    address: "京都府京都市左京区岡崎成勝寺町9-1",
  },
};

export function venueByKeyword(text: string): Venue | null {
  const t = text.toLowerCase();
  if (t.includes("ビッグサイト") || t.includes("big sight") || t.includes("tokyo big")) {
    return VENUES.tokyo_big_sight;
  }
  if (t.includes("幕張") || t.includes("makuhari")) return VENUES.makuhari;
  if (t.includes("みやこめっせ") || t.includes("京まふ") || t.includes("kyomaf")) {
    return VENUES.kyoto_miyako;
  }
  if (t.includes("킨텍스") || t.includes("kintex")) return VENUES.kintex;
  if (t.includes("코엑스") || t.includes("coex")) return VENUES.coex;
  if (t.includes("벡스코") || t.includes("bexco")) return VENUES.bexco;
  if (t.includes("setec")) return VENUES.setec;
  if (t.includes("부천") || t.includes("biaf")) {
    return {
      lat: 37.5034,
      lng: 126.766,
      venueName: "부천 (BIAF)",
      address: "경기 부천시",
    };
  }
  if (t.includes("센텀") || t.includes("bccc")) {
    return {
      lat: 35.1698,
      lng: 129.1312,
      venueName: "부산문화콘텐츠콤플렉스",
      address: "부산 해운대구 센텀중앙로 97",
    };
  }
  return null;
}
