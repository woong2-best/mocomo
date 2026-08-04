# 카카오 로컬 API (중고 거래 장소)

## 오류: `disabled OPEN_MAP_AND_LOCAL service`

REST API 키는 맞지만 **카카오맵·로컬 서비스가 앱에서 OFF** 인 상태입니다.

### 해결 (1분)

1. [카카오 개발자 콘솔](https://developers.kakao.com/console/app) → **MoCoMo** 클릭
2. 왼쪽 **제품 설정** → **카카오맵** 클릭
3. **활성화 설정** (또는 **사용 설정**) → **ON**
4. **Web** 플랫폼에 도메인 등록 (없으면):
   - `https://mocomo.net`
   - `http://localhost:3000` (로컬 개발용)
5. 저장 후 1~2분 뒤 `/used/new` 에서 장소 검색 재시도

### 환경 변수

- `KAKAO_REST_API_KEY` = **플랫폼 키** 화면의 **REST API 키** (JavaScript 키 아님)
- `NEXT_PUBLIC_KAKAO_JS_KEY` = **JavaScript 키** (웹 직거래 지도 · Kakao Maps JS SDK)
- `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY` = **네이티브 앱 키** (모바일 카카오맵 Native SDK)
- Vercel Production / Development 에 REST·JS 키 설정 · EAS에 Native 앱 키 설정

### 지도 엔진 선택

- `meetCountry === "KR"` → 카카오맵 (웹 JS / 앱 Native)
- 그 외 → MapLibre + OpenStreetMap
- DB에는 엔진 종류를 저장하지 않고 `meetLat` / `meetLng` / `meetCountry` / `meetPlace`만 저장합니다.

### 테스트

```bash
curl.exe -H "Authorization: KakaoAK YOUR_REST_KEY" "https://dapi.kakao.com/v2/local/search/keyword.json?query=강남역&size=1"
```

`documents` 배열이 보이면 성공입니다.
