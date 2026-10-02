/**
 * 해외 상설 메이드 카페 시드 (메이드리밍·@ほぉ～む 등 공식 공개 주소 기준, 2026-07)
 * 영업 여부·위치는 변동될 수 있으니 방문 전 공식 채널 확인.
 */

import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";
import type { SubcultureEventSeed } from "@/lib/subculture-event-types";

const OPEN = "2024-01-01T12:00:00+09:00";
const ENDS = "2099-12-31T23:59:59+09:00";

function maid(
  country: SubcultureEventCountry,
  partial: Omit<SubcultureEventSeed, "category" | "startsAt" | "endsAt" | "country"> & {
    startsAt?: string;
  }
): SubcultureEventSeed {
  const { startsAt, ...rest } = partial;
  return {
    ...rest,
    country,
    category: "maid_cafe",
    startsAt: startsAt ?? OPEN,
    endsAt: ENDS,
  };
}

/** 일본 — 메이드리밍 전 지점 + @ほぉ～む + MAID√MADE */
export const JP_MAID_CAFE_SEEDS: SubcultureEventSeed[] = [
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-akihabara-honten",
    title: "めいどりーみん 秋葉原本店",
    description: "Permanent · Akihabara · Maidreamin main store",
    venueName: "めいどりーみん 秋葉原本店",
    address: "東京都千代田区外神田3-16-17 住吉ビル6F",
    lat: 35.701974,
    lng: 139.771395,
    sourceUrl: "https://maidreamin.com/shop/detail.html?id=1",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-akiba",
    title: "めいどりーみん 秋葉原 AKIBA",
    description: "Permanent · Akihabara",
    venueName: "めいどりーみん AKIBA",
    address: "東京都千代田区外神田1-8-4 銭谷ビル3F",
    lat: 35.69885,
    lng: 139.77155,
    sourceUrl: "https://maidreamin.com/shop/detail.html?id=2",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-idol-street",
    title: "めいどりーみん 秋葉原アイドル通り店",
    description: "Permanent · Akihabara idol street",
    venueName: "めいどりーみん アイドル通り",
    address: "東京都千代田区外神田1-14-1 宝田中央通りビル3F",
    lat: 35.69855,
    lng: 139.77285,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-chuo-dori",
    title: "めいどりーみん 秋葉原中央通り店",
    description: "Permanent · Akihabara central street",
    venueName: "めいどりーみん 中央通り",
    address: "東京都千代田区外神田1-14-1 宝田中央通りビル2F",
    lat: 35.69848,
    lng: 139.77272,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-denkigai",
    title: "めいどりーみん 秋葉原電気街口駅前店",
    description: "Permanent · Akihabara electric town",
    venueName: "めいどりーみん 電気街口",
    address: "東京都千代田区外神田1-15-9 いちご秋葉原駅前ビル6F",
    lat: 35.6982,
    lng: 139.7734,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-heavens-gate",
    title: "めいどりーみん LIVE Heaven’s Gate",
    description: "Permanent · Akihabara · live restaurant",
    venueName: "Heaven’s Gate",
    address: "東京都千代田区外神田1-15-9 いちご秋葉原駅前ビル6F",
    lat: 35.69815,
    lng: 139.77355,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-sotokanda1",
    title: "めいどりーみん 秋葉原外神田一丁目店",
    description: "Permanent · Akihabara foreign shrine",
    venueName: "めいどりーみん 外神田一丁目",
    address: "東京都千代田区外神田1-8-10 バウハウス2F",
    lat: 35.699106,
    lng: 139.770456,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-kyoeki",
    title: "めいどりーみん 秋葉原（外神田4丁目）",
    description: "Permanent · Akihabara",
    venueName: "めいどりーみん 外神田4丁目",
    address: "東京都千代田区外神田4-4-2 京映外神田ビル4F",
    lat: 35.7008,
    lng: 139.7719,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-shinjuku",
    title: "めいどりーみん 新宿東口店",
    description: "Permanent · Shinjuku east",
    venueName: "めいどりーみん 新宿東口",
    address: "東京都新宿区新宿3-22-10",
    lat: 35.693136,
    lng: 139.70162,
    sourceUrl: "https://maidreamin.com/shop/detail.html?id=9",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-shibuya",
    title: "めいどりーみん 渋谷 SHIBUYA",
    description: "Permanent · Shibuya",
    venueName: "めいどりーみん SHIBUYA",
    address: "東京都渋谷区宇田川町30-1 蓬莱屋ビルB1",
    lat: 35.662075,
    lng: 139.697496,
    sourceUrl: "https://maidreamin.com/shop/detail.html?id=11",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-ikebukuro",
    title: "めいどりーみん 池袋サンシャイン通り店",
    description: "Permanent · Ikebukuro",
    venueName: "めいどりーみん 池袋",
    address: "東京都豊島区東池袋1-22-14 ロッカビル7F",
    lat: 35.731155,
    lng: 139.714938,
    sourceUrl: "https://maidreamin.com/shop/detail.html?id=8",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-osu-maneki",
    title: "めいどりーみん 名古屋大須招き猫前店",
    description: "Permanent · Nagoya Osu",
    venueName: "めいどりーみん 大須招き猫前",
    address: "愛知県名古屋市中区大須3-30-21",
    lat: 35.1588,
    lng: 136.9652,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-osu-akamon",
    title: "めいどりーみん 名古屋大須赤門通り店",
    description: "Permanent · Nagoya Osu red-light street",
    venueName: "めいどりーみん 大須赤門通り",
    address: "愛知県名古屋市中区大須3-33-9",
    lat: 35.1575,
    lng: 136.966,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-namba",
    title: "めいどりーみん 大阪なんば店",
    description: "Permanent · Osaka Namba",
    venueName: "めいどりーみん なんば",
    address: "大阪府大阪市浪速区難波中2-2-21 難波バレビル3F",
    lat: 34.661486,
    lng: 135.50272,
    sourceUrl: "https://maidreamin.com/shop/detail.html?id=16",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-nipponbashi",
    title: "めいどりーみん 大阪日本橋オタロード店",
    description: "Permanent · Osaka Nipponbashi otaku road",
    venueName: "めいどりーみん 日本橋",
    address: "大阪府大阪市浪速区難波中2-3-12",
    lat: 34.6665,
    lng: 135.506,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-sapporo",
    title: "めいどりーみん 札幌狸小路店",
    description: "Permanent · Sapporo Tanukikoji",
    venueName: "めいどりーみん 札幌狸小路",
    address: "北海道札幌市中央区南二条西4-10-2 清水ビル6F",
    lat: 43.057928,
    lng: 141.350916,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-tenjin",
    title: "めいどりーみん 天神西通り店",
    description: "Permanent · Fukuoka Tenjin",
    venueName: "めいどりーみん 天神西通り",
    address: "福岡県福岡市中央区大名1-12-61",
    lat: 33.589306,
    lng: 130.393243,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidreamin-kokura",
    title: "めいどりーみん 小倉あるあるCity店",
    description: "Permanent · Kitakyushu Kokura",
    venueName: "めいどりーみん 小倉あるあるCity",
    address: "福岡県北九州市小倉北区浅野2-14-5",
    lat: 33.8875,
    lng: 130.8755,
    sourceUrl: "https://maidreamin.com/shop/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-athome-honten",
    title: "＠ほぉ～むカフェ 本店",
    description: "Permanent · Akihabara · @home cafe",
    venueName: "@ほぉ～むカフェ 本店",
    address: "東京都千代田区外神田1-11-4 ミツワビル3-7F",
    lat: 35.699554,
    lng: 139.770788,
    sourceUrl: "https://www.cafe-athome.com/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-athome-donki",
    title: "＠ほぉ～むカフェ ドン・キホーテ店",
    description: "Permanent · Akihabara Don Quijote 5F",
    venueName: "@ほぉ～むカフェ ドンキ店",
    address: "東京都千代田区外神田4-3-3 ドン・キホーテ秋葉原店5F",
    lat: 35.7004,
    lng: 139.7716,
    sourceUrl: "https://www.cafe-athome.com/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidmade-akihabara",
    title: "MAID√MADE 秋葉原駅前店",
    description: "Permanent · near Akihabara Station",
    venueName: "MAID√MADE 秋葉原",
    address: "東京都千代田区外神田1-15-13 秋葉原B&Vビル10F",
    lat: 35.6981,
    lng: 139.7736,
    sourceUrl: "https://made-maid.com/",
  }),
  maid("jp", {
    externalKey: "venue-maid-jp-maidmade-osu",
    title: "MAID√MADE 名古屋大須本店",
    description: "Permanent · Nagoya Osu",
    venueName: "MAID√MADE 大須",
    address: "愛知県名古屋市中区大須3-35-23",
    lat: 35.1572,
    lng: 136.9658,
    sourceUrl: "https://made-maid.com/",
  }),
];

/** 태국 — 메이드리밍 */
export const TH_MAID_CAFE_SEEDS: SubcultureEventSeed[] = [
  maid("th", {
    externalKey: "venue-maid-th-maidreamin-mbk",
    title: "Maidreamin MBK Bangkok",
    description: "Permanent · Bangkok MBK Center 7F",
    venueName: "Maidreamin MBK",
    address: "444 MBK Center 7F, Phayathai Rd, Pathumwan, Bangkok",
    lat: 13.7447151,
    lng: 100.5299165,
    sourceUrl: "https://maidreamin.co.th/access/",
  }),
  maid("th", {
    externalKey: "venue-maid-th-maidreamin-future-park",
    title: "Maidreamin Future Park Rangsit",
    description: "Permanent · Bangkok suburbs Future Park ZPELL 3F",
    venueName: "Maidreamin Future Park",
    address: "Future Park Rangsit ZPELL 3F, Pathum Thani",
    lat: 13.9889524,
    lng: 100.6184404,
    sourceUrl: "https://maidreamin.co.th/access/",
  }),
];

/** 영국 — 런던·맨체스터 상설 메이드 카페 */
export const GB_MAID_CAFE_SEEDS: SubcultureEventSeed[] = [
  maid("gb", {
    externalKey: "venue-maid-gb-usagi-london",
    title: "Usagi Anime Maid Cafe",
    description: "Permanent · London Holborn · UK's first anime maid cafe",
    venueName: "Usagi Anime Maid Cafe",
    address: "17 Little Russell Street, London WC1A 2HL",
    lat: 51.5180307,
    lng: -0.1248916,
    sourceUrl: "https://www.usagi-maid.com/",
  }),
  maid("gb", {
    externalKey: "venue-maid-gb-animaid-manchester",
    title: "Animaid Cafe",
    description: "Permanent · Manchester Afflecks 2F · Japanese-style maid cafe",
    venueName: "Animaid Cafe",
    address: "Afflecks, 52 Church Street, Manchester M4 1PW",
    lat: 53.4825243,
    lng: -2.2362288,
    sourceUrl: "https://www.animaidcafe.co.uk/",
  }),
];

/** 대만 — 시먼딩 일대 대표 여포카페 존 */
export const TW_MAID_CAFE_SEEDS: SubcultureEventSeed[] = [
  maid("tw", {
    externalKey: "venue-maid-tw-ximending-cluster",
    title: "Ximending maid cafe street (Ximending)",
    description: "Permanent · Taipei Ximending maid cafe district",
    venueName: "西門町 女僕咖啡",
    address: "台北市萬華區西門町",
    lat: 25.042841,
    lng: 121.507707,
    sourceUrl: "https://www.google.com/maps/search/西門町+女僕咖啡",
  }),
];

export const INTERNATIONAL_MAID_CAFE_SEEDS: SubcultureEventSeed[] = [
  ...JP_MAID_CAFE_SEEDS,
  ...TH_MAID_CAFE_SEEDS,
  ...TW_MAID_CAFE_SEEDS,
  ...GB_MAID_CAFE_SEEDS,
];
