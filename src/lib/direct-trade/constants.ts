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
  "Never share your passcode with the other party until the trade (item inspection) is fully complete.";

export const MEETUP_GPS_RETRY_MESSAGE =
  "Could not verify your location accurately. Please try again shortly.";

export const MEETUP_NOSHOW_ALERT =
  "The other party reported arriving at the meetup spot. If you are on site, complete arrival verification.";
