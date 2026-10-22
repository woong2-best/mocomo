export const IDOL_LIVES = [
  {
    id: "airi" as const,
    channelId: "idol-airi",
    accent: "#ff4d8d",
    poster: require("../../../../assets/idol-airi.jpg"),
    nameKey: "m.live.idol_airi_name" as const,
    titleKey: "m.live.idol_airi_title" as const,
    roleKey: "m.live.idol_airi_role" as const,
  },
  {
    id: "chloe" as const,
    channelId: "idol-chloe",
    accent: "#c4a574",
    poster: require("../../../../assets/idol-chloe.jpg"),
    nameKey: "m.live.idol_chloe_name" as const,
    titleKey: "m.live.idol_chloe_title" as const,
    roleKey: "m.live.idol_chloe_role" as const,
  },
  {
    id: "stella" as const,
    channelId: "idol-stella",
    accent: "#3ddcff",
    poster: require("../../../../assets/idol-stella.jpg"),
    nameKey: "m.live.idol_stella_name" as const,
    titleKey: "m.live.idol_stella_title" as const,
    roleKey: "m.live.idol_stella_role" as const,
  },
];

export type IdolLiveId = (typeof IDOL_LIVES)[number]["id"];
