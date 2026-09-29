/** 현장 도착으로 보는 최대 거리 (미터) */
export const MEETUP_ARRIVAL_MAX_DISTANCE_M = 50;

/** 이보다 나쁜 정확도는 도착으로 인정하지 않는다 */
export const MEETUP_ARRIVAL_MAX_ACCURACY_M = 50;

/** GPS·권한·정확도 실패 재시도 상한 */
export const MEETUP_GPS_MAX_ATTEMPTS = 3;

/** 장소 밖(좌표는 나왔으나 50m 초과) 재시도 상한 */
export const MEETUP_RANGE_MAX_ATTEMPTS = 8;

export const MEETUP_VERIFY_MIN_INTERVAL_MS = 20_000;

/** 약속 시각 이후 노쇼 신고가 열리는 시간 */
export const MEETUP_NOSHOW_GRACE_MINUTES = 20;

/** 노쇼 신고 뒤 상대가 도착 인증할 수 있는 시간 */
export const MEETUP_NOSHOW_RESPONSE_MINUTES = 20;

export const MEETUP_PIN_MAX_ATTEMPTS = 5;

export const MEETUP_ADJUST_MINUTES = 15;

export const MEETUP_ADJUST_MAX = 4;

export const MEETUP_PIN_WARNING =
  "절대로 거래(물건 확인)가 완전히 완료되기 전까지 상대방에게 암호코드를 알려주지 마세요.";

export const MEETUP_GPS_RETRY_MESSAGE =
  "현재 위치를 정확하게 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.";

export const MEETUP_NOSHOW_ALERT =
  "상대방이 현재 거래 장소에 도착했다고 신고했습니다. 현장에 도착했다면 도착 인증을 진행해 주세요.";
