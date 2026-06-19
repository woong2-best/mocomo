# MoCoMo Studio 개발 문서 (PRD)

> **범위:** MoCoMo Studio 신규 개발만. 기존 MoCoMo 서비스는 변경하지 않는다.  
> **도메인:** `studio.mocomo.com` (신규) · `mocomo.com` (기존, 변경 금지)

---

## 중요 — 반드시 준수

MoCoMo Studio는 **기존 MoCoMo 서비스와 별개의 시스템**이다.

**절대로** 기존 MoCoMo의 기능, UI, 데이터 구조, 페이지 구성, 사용자 경험을 변경하지 않는다.

| 서비스 | 역할 | 상태 |
|--------|------|------|
| **MoCoMo** (`mocomo.com`) | 소비 공간 | 기존 유지 · **변경 금지** |
| **MoCoMo Studio** (`studio.mocomo.com`) | 제작 공간 | **신규 개발** |

Studio는 독립적인 크리에이터 플랫폼으로 동작한다.  
두 서비스는 **연동**되지만, 서로의 **핵심 기능과 UI를 직접 변경하지 않는다**.

---

## 목적

MoCoMo Studio는 유저가 직접 콘텐츠를 제작하고 배포할 수 있는 **창작 플랫폼**이다.

Studio에서 제작된 콘텐츠는 **승인 후** MoCoMo에서 사용 가능해진다.

```text
MoCoMo        = 소비 공간
MoCoMo Studio = 제작 공간
```

---

## 서비스 구조

```text
mocomo.com          → 기존 서비스 (변경 금지)
studio.mocomo.com   → 신규 서비스 (새롭게 개발)
```

### 코드·배포 분리 원칙

- Studio 전용 코드베이스/앱 (또는 모노레포 내 `studio/` 네임스페이스)
- Studio 전용 DB 스키마·스토리지 버킷 (크리에이터 자산, 검수, 정산)
- MoCoMo 연동은 **승인된 자산 공급 API** 한 경로로만 수행
- MoCoMo 쪽 변경이 필요할 경우: **읽기 전용 수신·인벤토리 등록 API** 추가만 허용 (기존 UX/페이지 수정 금지)

---

## 계정 연동

- **MoCoMo 계정 사용** — 별도 회원가입 없음
- OAuth/세션: MoCoMo Auth를 Studio에서 SSO로 재사용
- Studio 전용 프로필(크리에이터명, 정산 정보)은 Studio DB에만 저장

---

## Studio 전용 기능

### Asset Creator

제작·업로드 가능 항목:

| 카테고리 | 예시 |
|----------|------|
| 가구 | 소파, 책상, 침대 |
| 장식품 | 액자, 인형, 소품 |
| 벽지 | 패턴, 단색 |
| 바닥재 | 나무, 타일, 카펫 |
| 조명 | 스탠드, 펜던트 |
| 식물 | 화분, 다육 |
| 포스터 | 일러스트, 사진 |
| 생활용품 | 컵, 책, 가전 |
| 아바타 액세서리 | 모자, 안경, 가방 |
| 아바타 의상 | 상의, 하의, 원피스 |

### Asset Upload

**지원 형식 (v1)**

```text
.glb
.gltf
```

**향후 확장**

```text
.fbx
.obj
```

### Asset Preview

업로드 즉시 3D 미리보기 제공:

- 회전
- 확대 / 축소
- (권장) 조명·배경 프리셋으로 Bondee 스타일 확인

---

## Bondee 스타일 규칙

Studio에서 제작되는 **모든** 콘텐츠는 MoCoMo 세계관과 동일한 스타일을 따라야 한다.

| 특징 | 설명 |
|------|------|
| 파스텔 색감 | 부드럽고 밝은 톤 |
| 귀여운 디자인 | 과하지 않은 카툰 비율 |
| 둥근 형태 | 날카로운 모서리 지양 |
| 저폴리곤 | 모바일·웹 실시간 렌더링 고려 |
| 카툰 렌더링 | PBR 과다·사실 조명 지양 |
| 아늑한 분위기 | APT·홈 씬과 조화 |

검수 단계에서 스타일 가이드 위반 시 **Rejected** 처리 가능.

---

## 자동 검사 (업로드 시)

| 검사 항목 | 목적 |
|-----------|------|
| 폴리곤 수 | 성능·품질 기준 |
| 텍스처 크기 | 메모리·로딩 |
| 파일 크기 | 업로드·CDN |
| 악성 데이터 | 보안 |
| 형식 오류 | glTF/GLB 유효성 |

자동 검사 실패 시 업로드 거부 또는 Draft 유지 + 수정 안내.

---

## 검수 시스템

자산 상태 흐름:

```text
Draft → Submitted → Reviewing → Approved → Published
                              ↘ Rejected
```

| 상태 | 설명 |
|------|------|
| Draft | 크리에이터 작업 중 |
| Submitted | 검수 요청 |
| Reviewing | 운영·자동 검수 진행 |
| Approved | MoCoMo 배포 대기/승인 |
| Rejected | 반려 (사유 필수) |
| Published | Studio 마켓·MoCoMo 인벤토리 반영 완료 |

---

## Asset Marketplace (Studio 내부)

크리에이터 배포 옵션:

- **무료 배포**
- **유료 판매**

판매 설정:

- 가격
- 카테고리
- 태그
- 설명
- 미리보기 이미지

---

## 크리에이터 페이지

각 크리에이터 전용 페이지 (`studio.mocomo.com/creator/[handle]`)

표시 항목:

- 프로필
- 대표 작품
- 업로드 목록
- 팔로워
- 좋아요 수
- 다운로드 수
- 판매 수

---

## 수익 시스템

```text
판매 발생
  ↓
플랫폼 수수료 차감
  ↓
크리에이터 수익 적립 (Studio 지갑)
  ↓
출금 신청
  ↓
관리자 정산 처리
```

- 정산·출금 로직은 **Studio 전용** (MoCoMo `/wallet` UI 변경 없음)
- MoCoMo 인앱 구매로 자산이 소비될 경우: Studio ↔ MoCoMo **정산 이벤트 API**로만 연동

---

## 자산 배포 시스템

```text
업로드 → 검수 → 승인 → 배포
```

승인·Published 이후:

1. Studio CDN/스토리지에 최종 에셋 URL 확정
2. **MoCoMo 인벤토리 등록 API** 호출 (승인된 메타데이터 + 에셋 URL)
3. MoCoMo 유저는 기존 인벤토리·APT 플로우로 자산 사용 (MoCoMo 코드 변경 최소)

### MoCoMo 연동 예시

```text
Studio: 신규 소파 제작
  ↓
검수 · 승인
  ↓
MoCoMo 인벤토리 등록 (API)
  ↓
MoCoMo 유저: APT·홈에서 사용 가능
```

**Studio는 기존 MoCoMo 기능을 수정하지 않는다.**  
**단지 승인된 자산을 공급한다.**

---

## MoCoMo 연동 계약 (개발 시 참고)

Studio → MoCoMo 방향 **단방향 공급**만 허용.

| 항목 | Studio | MoCoMo |
|------|--------|--------|
| 자산 메타 | source of truth | 수신·캐시 |
| 검수 상태 | source of truth | Published만 노출 |
| 크리에이터 수익 | source of truth | 변경 없음 |
| 유저 인벤토리 | 등록 요청만 | source of truth |

권장 페이로드 (예시):

```json
{
  "studioAssetId": "uuid",
  "category": "furniture",
  "name": "파스텔 소파",
  "glbUrl": "https://cdn.../asset.glb",
  "thumbnailUrl": "https://cdn.../thumb.webp",
  "tags": ["sofa", "pastel"],
  "creatorId": "mocomo-user-id",
  "price": 0,
  "publishedAt": "ISO8601"
}
```

MoCoMo 측: 위 API를 **수신하는 엔드포인트 1개** 추가는 허용.  
기존 APT·인벤토리 **UI/UX 변경은 금지**.

---

## 최종 목표

MoCoMo Studio는 다음 역할을 수행한다:

1. **창작 툴** — Asset Creator, Preview, Upload
2. **자산 마켓** — 무료/유료 배포
3. **크리에이터 플랫폼** — 프로필, 팔로우, 수익

MoCoMo는 **소비·커뮤니티·APT** 중심으로 유지한다.

---

## 비목표 (Out of Scope)

- MoCoMo 메인 사이트 UI/네비게이션 변경
- MoCoMo 기존 마켓·후원·라이브 기능과 Studio 기능 혼합
- Studio 없이 MoCoMo 내 직접 3D 에디터 추가
- 기존 Bondee APT 에디터를 Studio로 대체하는 리팩터

---

## 배포

| 환경 | 도메인 | 비고 |
|------|--------|------|
| Production | `studio.mocomo.com` | Studio 전용 Vercel/호스팅 프로젝트 |
| Staging | `studio-staging.mocomo.com` | 선택 |
| MoCoMo | `mocomo.com` | **본 PRD 범위 외** |

DNS: `studio` 서브도메인 → Studio 앱. MoCoMo DNS/라우팅 변경 없음.

---

## 관련 문서

| 문서 | 관계 |
|------|------|
| `docs/virtual_avatar_studio_PRD.md` | MoCoMo **내부** `/avatar/studio` (라이브용) — **본 Studio와 별개** |
| `scripts/UPLOAD-STORAGE-SETUP.md` | 스토리지 참고 (Studio 전용 버킷 분리 권장) |

---

*문서 버전: v1.0 · MoCoMo Studio 전용 — MoCoMo 본 서비스 변경 금지*
