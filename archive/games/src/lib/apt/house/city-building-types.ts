export type CityBuildingType = "shop" | "cafe" | "office" | "residential" | "clinic";

export type CityBuildingMeta = {
  id: string;
  type: CityBuildingType;
  label: string;
  x: number;
  z: number;
  rotY: number;
  floors: number;
};

export const CITY_TYPE_LABELS: Record<CityBuildingType, string> = {
  shop: "상점",
  cafe: "카페",
  office: "오피스",
  residential: "주거",
  clinic: "의원",
};
