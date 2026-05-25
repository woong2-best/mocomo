export const LEGAL_CONTACT_EMAIL = "mocomo.company@gmail.com";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "hr" };

export type LegalDocument = {
  slug: string;
  title: string;
  updatedAt: string;
  intro?: string;
  blocks: LegalBlock[];
};

export const COMMUNITY_POLICY: LegalDocument = {
  slug: "policy",
  title: "MoCoMo 운영원칙 및 이용정책",
  updatedAt: "2026년 5월 25일",
  intro:
    "MoCoMo는 사용자들이 자유롭게 소통하고 콘텐츠를 공유할 수 있는 커뮤니티 플랫폼입니다. 모든 사용자가 안전하게 서비스를 이용할 수 있도록 아래 정책을 운영합니다.",
  blocks: [
    { type: "h2", text: "1. 안전한 커뮤니티" },
    { type: "p", text: "다음 행위는 허용되지 않습니다." },
    { type: "h3", text: "폭력 및 위협" },
    {
      type: "ul",
      items: [
        "폭력 행위 조장",
        "살해 협박",
        "범죄 예고",
        "테러 및 범죄 조직 홍보",
      ],
    },
    { type: "h3", text: "괴롭힘 및 혐오 표현" },
    {
      type: "ul",
      items: [
        "지속적인 비난 및 스토킹",
        "특정 사용자 집단 공격",
        "인종, 국적, 성별, 종교, 장애 등을 이유로 한 차별 및 혐오 표현",
      ],
    },
    { type: "h3", text: "불법 성적 콘텐츠" },
    {
      type: "ul",
      items: [
        "아동·청소년 대상 성적 콘텐츠",
        "불법 촬영물",
        "동의 없는 신체 노출 콘텐츠",
        "성착취 콘텐츠",
      ],
    },
    {
      type: "p",
      text: "위 항목은 발견 즉시 삭제 및 영구 정지될 수 있으며 관련 법률에 따라 신고될 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "2. 개인정보 보호" },
    { type: "p", text: "다음 정보는 허가 없이 공개할 수 없습니다." },
    {
      type: "ul",
      items: [
        "전화번호",
        "주소",
        "계좌번호",
        "주민등록번호",
        "학교 및 직장 정보",
        "타인의 사진 및 신상정보",
      ],
    },
    { type: "p", text: "개인정보 유출 및 사생활 침해 행위는 제한될 수 있습니다." },
    { type: "hr" },
    { type: "h2", text: "3. 플랫폼 악용 금지" },
    { type: "p", text: "다음 행위는 금지됩니다." },
    {
      type: "ul",
      items: [
        "스팸 및 도배",
        "허위 신고",
        "피싱 및 사기",
        "악성코드 배포",
        "서비스 해킹 시도",
        "자동화 봇 악용",
        "비정상 트래픽 생성",
      ],
    },
    { type: "hr" },
    { type: "h2", text: "4. 저작권 정책" },
    { type: "p", text: "사용자는 자신이 업로드한 콘텐츠에 필요한 권리를 보유해야 합니다." },
    { type: "p", text: "다음 행위는 제한될 수 있습니다." },
    {
      type: "ul",
      items: [
        "타인의 그림·사진·영상 무단 업로드",
        "불법 복제물 공유",
        "상표권 침해",
      ],
    },
    { type: "p", text: "권리자의 요청이 있을 경우 콘텐츠는 삭제될 수 있습니다." },
    { type: "hr" },
    { type: "h2", text: "5. 청소년 보호" },
    {
      type: "p",
      text: "MoCoMo는 청소년 보호를 위해 노력합니다. 아동·청소년 성보호 관련 법률을 위반하는 콘텐츠는 무관용 정책으로 처리됩니다. 필요 시 관계 기관에 신고될 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "6. 신고 및 제재" },
    { type: "p", text: "MoCoMo는 정책 위반 정도에 따라 아래 조치를 진행할 수 있습니다." },
    {
      type: "ul",
      items: [
        "게시물 삭제",
        "댓글 제한",
        "기능 제한",
        "일시 정지",
        "영구 정지",
      ],
    },
    { type: "p", text: "심각한 불법 행위는 경고 없이 즉시 영구 정지될 수 있습니다." },
    { type: "hr" },
    { type: "h2", text: "7. 운영자 권한" },
    {
      type: "p",
      text: "MoCoMo는 서비스 보호 및 사용자 안전을 위해 운영자 판단에 따라 콘텐츠 삭제 또는 계정 제한 조치를 진행할 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "8. 정책 변경" },
    {
      type: "p",
      text: "본 정책은 서비스 운영 및 법률 변경에 따라 수정될 수 있습니다. 중요 변경 사항은 공지사항을 통해 안내됩니다.",
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  slug: "terms",
  title: "MoCoMo 이용약관",
  updatedAt: "2026년 5월 25일",
  intro:
    "본 약관은 MoCoMo 서비스 이용과 관련된 조건 및 규칙을 정의합니다. 서비스 이용 시 본 약관에 동의한 것으로 간주됩니다.",
  blocks: [
    { type: "h2", text: "1. 서비스 제공" },
    {
      type: "p",
      text: "MoCoMo는 온라인 커뮤니티 및 콘텐츠 공유 서비스를 제공합니다. 서비스 내용은 변경 또는 종료될 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "2. 회원가입 및 계정" },
    { type: "p", text: "사용자는 정확한 정보를 기반으로 계정을 생성해야 합니다." },
    { type: "p", text: "다음 행위는 금지됩니다." },
    {
      type: "ul",
      items: [
        "타인 사칭",
        "계정 판매 및 거래",
        "제재 회피 목적의 계정 생성",
        "무단 계정 접근",
      ],
    },
    { type: "p", text: "계정 보안 책임은 사용자에게 있습니다." },
    { type: "hr" },
    { type: "h2", text: "3. 사용자 콘텐츠" },
    { type: "p", text: "사용자는 자신이 업로드한 콘텐츠에 대한 책임을 부담합니다." },
    { type: "p", text: "MoCoMo는 아래 콘텐츠를 제한할 수 있습니다." },
    {
      type: "ul",
      items: [
        "불법 콘텐츠",
        "폭력 콘텐츠",
        "혐오 표현",
        "성착취 콘텐츠",
        "저작권 침해 콘텐츠",
        "개인정보 노출 콘텐츠",
        "사기 및 악성 링크",
      ],
    },
    { type: "hr" },
    { type: "h2", text: "4. 서비스 이용 제한" },
    {
      type: "p",
      text: "MoCoMo는 정책 위반 시 서비스 이용을 제한할 수 있습니다. 필요 시 사전 통보 없이 조치될 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "5. 유료 서비스 및 후원" },
    {
      type: "p",
      text: "일부 기능은 유료로 제공될 수 있습니다. 디지털 상품 특성상 사용된 서비스는 환불이 제한될 수 있습니다. 부정 결제 및 악용 시 계정이 제한될 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "6. 면책" },
    {
      type: "p",
      text: "MoCoMo는 사용자가 작성한 콘텐츠에 대한 직접적인 책임을 지지 않습니다. 사용자 간 분쟁 책임은 당사자에게 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "7. 서비스 중단" },
    {
      type: "p",
      text: "서버 점검, 장애, 천재지변 등으로 서비스가 일시 중단될 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "8. 준거법" },
    { type: "p", text: "본 약관은 대한민국 법률을 따릅니다." },
    { type: "hr" },
    { type: "h2", text: "9. 문의" },
    { type: "p", text: `고객문의: ${LEGAL_CONTACT_EMAIL}` },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  slug: "privacy",
  title: "MoCoMo 개인정보처리방침",
  updatedAt: "2026년 5월 25일",
  intro:
    "MoCoMo는 개인정보 보호법 등 대한민국 관련 법률을 준수하기 위해 노력합니다.",
  blocks: [
    { type: "h2", text: "1. 수집하는 정보" },
    { type: "p", text: "MoCoMo는 다음 정보를 수집할 수 있습니다." },
    { type: "h3", text: "회원가입 시" },
    { type: "ul", items: ["이메일 주소", "사용자명", "암호화된 비밀번호"] },
    { type: "h3", text: "서비스 이용 시" },
    {
      type: "ul",
      items: ["IP 주소", "브라우저 정보", "쿠키", "접속 기록", "기기 정보"],
    },
    { type: "h3", text: "사용자가 업로드하는 정보" },
    { type: "ul", items: ["게시물", "댓글", "이미지", "메시지"] },
    { type: "hr" },
    { type: "h2", text: "2. 개인정보 이용 목적" },
    { type: "p", text: "수집된 정보는 다음 목적으로 사용됩니다." },
    {
      type: "ul",
      items: [
        "서비스 운영",
        "계정 인증 및 보안",
        "스팸 및 악성 활동 방지",
        "신고 처리",
        "고객 문의 대응",
        "서비스 개선",
      ],
    },
    { type: "hr" },
    { type: "h2", text: "3. 개인정보 보관" },
    {
      type: "p",
      text: "MoCoMo는 법령 또는 서비스 운영상 필요한 기간 동안 정보를 보관할 수 있습니다. 관련 법률에 따라 일정 기간 보관될 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "4. 개인정보 제공" },
    { type: "p", text: "MoCoMo는 다음 경우를 제외하고 개인정보를 외부에 제공하지 않습니다." },
    {
      type: "ul",
      items: [
        "사용자 동의가 있는 경우",
        "법적 요청이 있는 경우",
        "서비스 운영상 필요한 경우",
      ],
    },
    { type: "hr" },
    { type: "h2", text: "5. 쿠키 사용" },
    {
      type: "p",
      text: "MoCoMo는 로그인 유지 및 서비스 개선을 위해 쿠키를 사용할 수 있습니다. 사용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "6. 사용자 권리" },
    {
      type: "p",
      text: "사용자는 자신의 개인정보 열람, 수정 및 삭제를 요청할 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "7. 청소년 보호" },
    {
      type: "p",
      text: "MoCoMo는 아동·청소년 대상 불법 콘텐츠에 대해 무관용 정책을 적용합니다.",
    },
    { type: "hr" },
    { type: "h2", text: "8. 정책 변경" },
    { type: "p", text: "본 방침은 변경될 수 있으며 중요한 변경 시 공지됩니다." },
    { type: "hr" },
    { type: "h2", text: "9. 문의" },
    { type: "p", text: `고객문의: ${LEGAL_CONTACT_EMAIL}` },
  ],
};

export const LEGAL_PAGES = [
  { href: "/legal/policy", label: "운영원칙 및 이용정책", doc: COMMUNITY_POLICY },
  { href: "/legal/terms", label: "이용약관", doc: TERMS_OF_SERVICE },
  { href: "/legal/privacy", label: "개인정보처리방침", doc: PRIVACY_POLICY },
] as const;
