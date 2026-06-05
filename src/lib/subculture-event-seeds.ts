/**
 * 공식·공개 일정 기반 시드 (2026-05 기준 수동 반영)
 * - 코믹월드: https://comicw.net
 * - 지스타: https://gstar.or.kr
 * - 서울팝콘(CCXP): https://seoulpopcon.org
 * - 하비페어(프라모델·피규어): https://www.hobbyfair.co.kr
 * - 서울일러스트코리아 / 서일페 / 일러스타 / AGF / BIAF
 */

export type SubcultureEventSeed = {
  externalKey: string;
  title: string;
  description?: string;
  category: "comic" | "anime" | "cosplay" | "goods" | "other";
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string;
  sourceUrl: string;
  /** 공식 관람안내 등 직접 링크 */
  officialNoticeUrl?: string;
};

export const SUBCULTURE_EVENT_SEEDS: SubcultureEventSeed[] = [
  {
    externalKey: "official-comicw-333-busan",
    title: "코믹월드 333 부산",
    description: "동인·코스프레·굿즈 (32회 부산문구전 동시). 관람 11:00~",
    category: "comic",
    venueName: "벡스코 제2전시장 4홀",
    address: "부산 해운대구 APEC로 55",
    lat: 35.1689,
    lng: 129.1362,
    startsAt: "2026-05-16T11:00:00+09:00",
    endsAt: "2026-05-17T16:30:00+09:00",
    sourceUrl: "https://comicw.net/",
    officialNoticeUrl: "https://comicw.net/e/333/8",
  },
  {
    externalKey: "official-illustar-11-kintex",
    title: "일러스타 페스 11",
    description: "일러스트·게임·굿즈 플리마켓. 관람 10:00~17:00",
    category: "goods",
    venueName: "킨텍스 제2전시장 9B·10홀",
    address: "경기 고양시 일산서구 킨텍스로 217-60",
    lat: 37.5278,
    lng: 126.6182,
    startsAt: "2026-05-23T10:00:00+09:00",
    endsAt: "2026-05-24T17:00:00+09:00",
    sourceUrl: "https://illustar.net/",
  },
  {
    externalKey: "official-illustration-korea-2026-coex",
    title: "2026 서울일러스트코리아",
    description: "일러스트 전시·아트마켓. 코엑스 B홀 4일간",
    category: "goods",
    venueName: "코엑스 B홀",
    address: "서울 강남구 영동대로 513",
    lat: 37.5122,
    lng: 127.0595,
    startsAt: "2026-04-23T10:00:00+09:00",
    endsAt: "2026-04-26T18:00:00+09:00",
    sourceUrl: "https://illustrationkorea.co.kr/",
    officialNoticeUrl: "https://illustrationkorea.co.kr/coex/visitors/guide/",
  },
  {
    externalKey: "official-comicw-summer-2026-kintex",
    title: "코믹월드 SUMMER 2026",
    description: "일산 킨텍스 · 서울디저트페어 통합. 관람 11:00~",
    category: "comic",
    venueName: "킨텍스 제1전시장",
    address: "경기 고양시 일산서구 킨텍스로 217-60",
    lat: 37.5273,
    lng: 126.6154,
    startsAt: "2026-07-18T11:00:00+09:00",
    endsAt: "2026-07-19T17:30:00+09:00",
    sourceUrl: "https://comicw.net/",
    officialNoticeUrl: "https://comicw.net/e/334/8",
  },
  {
    externalKey: "official-seoul-illust-fair-v21-coex",
    title: "서울일러스트레이션페어 V.21",
    description: "서일페 · 약 1,000팀 부스. 코엑스 C홀",
    category: "goods",
    venueName: "코엑스 C홀",
    address: "서울 강남구 영동대로 513",
    lat: 37.5115,
    lng: 127.0602,
    startsAt: "2026-07-30T10:00:00+09:00",
    endsAt: "2026-08-02T18:00:00+09:00",
    sourceUrl: "https://www.sif.or.kr/",
  },
  {
    externalKey: "official-comicw-335-kintex",
    title: "코믹월드 335 일산",
    description: "동인 전시교류전. 관람 11:00~",
    category: "comic",
    venueName: "킨텍스 제1전시장",
    address: "경기 고양시 일산서구 킨텍스로 217-60",
    lat: 37.5273,
    lng: 126.6154,
    startsAt: "2026-08-15T11:00:00+09:00",
    endsAt: "2026-08-16T16:30:00+09:00",
    sourceUrl: "https://comicw.net/",
    officialNoticeUrl: "https://comicw.net/e/335/1",
  },
  {
    externalKey: "official-comicw-336-kintex",
    title: "코믹월드 336 일산",
    description: "동인·코스프레. 관람 11:00~",
    category: "comic",
    venueName: "킨텍스 제1전시장",
    address: "경기 고양시 일산서구 킨텍스로 217-60",
    lat: 37.5273,
    lng: 126.6154,
    startsAt: "2026-09-12T11:00:00+09:00",
    endsAt: "2026-09-13T16:30:00+09:00",
    sourceUrl: "https://comicw.net/",
    officialNoticeUrl: "https://comicw.net/e/336/8",
  },
  {
    externalKey: "official-biaf-2026-bucheon",
    title: "BIAF 2026 (부천국제애니메이션페스티벌)",
    description: "제28회 · 5일간. 애니메이션 영화제",
    category: "anime",
    venueName: "부천 (BIAF)",
    address: "경기 부천시 원미구",
    lat: 37.5034,
    lng: 126.766,
    startsAt: "2026-10-23T10:00:00+09:00",
    endsAt: "2026-10-27T21:00:00+09:00",
    sourceUrl: "https://biaf.or.kr/kr/",
  },
  {
    externalKey: "official-agf-2026-kintex",
    title: "AGF 2026 (애니×게임 페스티벌)",
    description:
      "킨텍스 1~5홀. 일정은 조직위 공식 확정 전(언론·공지 유출 12/4~6). 변경 가능",
    category: "anime",
    venueName: "킨텍스 제1전시장",
    address: "경기 고양시 일산서구 킨텍스로 217-60",
    lat: 37.5273,
    lng: 126.6154,
    startsAt: "2026-12-04T09:30:00+09:00",
    endsAt: "2026-12-06T18:00:00+09:00",
    sourceUrl: "https://www.agfkorea.com/",
  },
  {
    externalKey: "official-hobby-fair-2026-setec",
    title: "하비페어 2026 (HOBBY FAIR)",
    description: "프라모델·피규어·미니어처 종합. 관람 10:00~18:00",
    category: "goods",
    venueName: "SETEC 제1전시장",
    address: "서울 강남구 남부순환로 3104",
    lat: 37.4842,
    lng: 127.0346,
    startsAt: "2026-06-06T10:00:00+09:00",
    endsAt: "2026-06-07T18:00:00+09:00",
    sourceUrl: "https://www.hobbyfair.co.kr/",
  },
  {
    externalKey: "official-gstar-2026-bexco",
    title: "지스타 2026 (G-STAR)",
    description: "국제게임전시회 BTC·BTB. 벡스코 1·2전시장 4일간",
    category: "anime",
    venueName: "벡스코 제1·2전시장",
    address: "부산 해운대구 APEC로 55",
    lat: 35.1689,
    lng: 129.1362,
    startsAt: "2026-11-19T10:00:00+09:00",
    endsAt: "2026-11-22T18:00:00+09:00",
    sourceUrl: "https://www.gstar.or.kr/",
    officialNoticeUrl: "https://www.gstar.or.kr/eng/part/gstar_part_info.do",
  },
  {
    externalKey: "official-seoul-popcon-2026-coex",
    title: "2026 서울팝콘 by CCXP",
    description: "팝컬처·코믹·게임·코스프레. 코엑스 C홀 3일",
    category: "cosplay",
    venueName: "코엑스 C홀",
    address: "서울 강남구 영동대로 513",
    lat: 37.5115,
    lng: 127.0602,
    startsAt: "2026-08-14T10:00:00+09:00",
    endsAt: "2026-08-16T17:00:00+09:00",
    sourceUrl: "https://seoulpopcon.org/",
    officialNoticeUrl: "https://seoulpopcon.org/seoulpopcon",
  },
  {
    externalKey: "official-busan-webtoon-2026-bccc",
    title: "부산글로벌웹툰페스티벌 2026 (예정)",
    description: "제10회 예정. 9~10월 센텀 일대 관례, 공식 일정 발표 시 갱신",
    category: "other",
    venueName: "부산문화콘텐츠콤플렉스",
    address: "부산 해운대구 센텀중앙로 97",
    lat: 35.1698,
    lng: 129.1312,
    startsAt: "2026-09-24T10:00:00+09:00",
    endsAt: "2026-09-27T18:00:00+09:00",
    sourceUrl: "https://www.bgwf.co.kr/",
  },
];

export const SUBCULTURE_EVENT_CATEGORY_LABELS: Record<string, string> = {
  comic: "코믹·동인",
  anime: "애니",
  cosplay: "코스프레",
  goods: "굿즈·일러스트",
  other: "기타",
};
