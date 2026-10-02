export type HousingType = "apartment" | "house";

export type HousingLocation = {
  countryCode: string;
  latitude: number;
  longitude: number;
  regionLabel: string;
};

/** 실제 지구 반경(m) → 3D 지구본 반경(단위) */
export const EARTH_RADIUS_M = 6_371_000;
export const GLOBE_RADIUS_UNITS = 5;

/** 1m → 3D 단위 (주택/건물 실제 비율 근사) */
export const METERS_PER_UNIT = 1;

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  apartment: "아파트",
  house: "주택",
};

export function metersToUnits(m: number) {
  return m / METERS_PER_UNIT;
}

/** 일반 단독주택 바닥 면적 근사 (m²) */
export const DEFAULT_HOUSE_FOOTPRINT_M2 = 120;
export const DEFAULT_APARTMENT_UNIT_M2 = 84;
