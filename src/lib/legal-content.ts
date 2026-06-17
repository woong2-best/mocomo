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
  blocks: [
    { type: "h2", text: "제1조 (목적)" },
    {
      type: "p",
      text: '본 약관은 MoCoMo(이하 "회사")가 제공하는 커뮤니티, 콘텐츠 공유, 스트리밍, 크리에이터 구독, 디지털 콘텐츠 판매 및 기타 관련 서비스의 이용 조건과 권리·의무를 규정합니다.',
    },
    { type: "hr" },
    { type: "h2", text: "제2조 (서비스 제공)" },
    { type: "p", text: "회사는 다음 서비스를 제공합니다." },
    {
      type: "ul",
      items: [
        "커뮤니티 및 게시판",
        "콘텐츠 업로드 및 공유",
        "스트리밍 서비스",
        "크리에이터 구독 서비스",
        "디지털 콘텐츠 판매",
        "기타 회사가 제공하는 서비스",
      ],
    },
    { type: "p", text: "회사는 서비스 일부 또는 전부를 변경, 추가, 중단할 수 있습니다." },
    { type: "hr" },
    { type: "h2", text: "제3조 (회원가입 및 계정)" },
    { type: "p", text: "사용자는 정확한 정보를 제공하여 계정을 생성해야 합니다." },
    { type: "p", text: "다음 행위는 금지됩니다." },
    {
      type: "ul",
      items: [
        "타인 사칭",
        "계정 판매, 양도, 대여",
        "제재 회피 목적의 계정 생성",
        "무단 계정 접근",
        "자동화된 비정상 활동",
      ],
    },
    { type: "p", text: "사용자는 계정 보안 유지에 대한 책임을 부담합니다." },
    { type: "hr" },
    { type: "h2", text: "제4조 (연령 제한)" },
    {
      type: "p",
      text: "사용자는 거주 국가의 법률에 따라 서비스를 이용할 수 있는 연령 이상이어야 합니다.",
    },
    {
      type: "p",
      text: "회사는 특정 콘텐츠 또는 기능에 대해 추가 연령 제한을 적용할 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제5조 (사용자 콘텐츠)" },
    { type: "p", text: "사용자는 자신이 업로드하는 콘텐츠에 대한 모든 책임을 부담합니다." },
    {
      type: "p",
      text: "사용자는 콘텐츠 업로드 시 해당 콘텐츠에 필요한 권리를 보유하고 있어야 합니다.",
    },
    {
      type: "p",
      text: "회사는 서비스 운영을 위해 콘텐츠를 저장, 전송, 표시, 복제할 수 있는 비독점적 라이선스를 부여받습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제6조 (금지 콘텐츠)" },
    { type: "p", text: "다음 콘텐츠는 금지됩니다." },
    {
      type: "ul",
      items: [
        "불법 콘텐츠",
        "성착취 콘텐츠",
        "아동 대상 성적 콘텐츠",
        "폭력 및 범죄 조장 콘텐츠",
        "혐오 표현",
        "저작권 침해 콘텐츠",
        "개인정보 노출 콘텐츠",
        "사기 행위",
        "악성코드 및 악성 링크",
        "법령 위반 콘텐츠",
      ],
    },
    { type: "p", text: "회사는 해당 콘텐츠를 삭제하거나 접근을 제한할 수 있습니다." },
    { type: "hr" },
    { type: "h2", text: "제7조 (크리에이터 서비스)" },
    { type: "p", text: "크리에이터는 자신이 제공하는 콘텐츠에 대한 책임을 부담합니다." },
    {
      type: "p",
      text: "회사는 크리에이터 콘텐츠의 정확성, 품질 또는 적법성을 보증하지 않습니다.",
    },
    { type: "p", text: "회사는 정책 위반 시 크리에이터 기능을 제한할 수 있습니다." },
    { type: "hr" },
    { type: "h2", text: "제8조 (유료 서비스)" },
    { type: "p", text: "일부 서비스는 유료로 제공될 수 있습니다." },
    { type: "p", text: "유료 서비스에는 다음이 포함될 수 있습니다." },
    {
      type: "ul",
      items: ["구독 서비스", "후원", "디지털 콘텐츠 구매", "기타 유료 기능"],
    },
    { type: "p", text: "가격은 사전 고지 후 변경될 수 있습니다." },
    { type: "hr" },
    { type: "h2", text: "제9조 (구독)" },
    { type: "p", text: "구독 서비스는 정기 결제로 제공될 수 있습니다." },
    { type: "p", text: "사용자가 구독을 취소하지 않는 경우 자동 갱신될 수 있습니다." },
    {
      type: "p",
      text: "사용자는 언제든지 다음 결제일부터 적용되는 방식으로 구독을 취소할 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제10조 (환불)" },
    {
      type: "p",
      text: "디지털 콘텐츠의 특성상 이미 제공되거나 소비된 서비스는 환불이 제한될 수 있습니다.",
    },
    {
      type: "p",
      text: "다만 관련 법령에서 요구하는 경우 회사는 해당 법령에 따라 환불을 제공합니다.",
    },
    {
      type: "p",
      text: "부정 결제 또는 결제 악용이 확인될 경우 서비스 이용이 제한될 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제11조 (저작권)" },
    { type: "p", text: "저작권자는 침해 신고를 제출할 수 있습니다." },
    {
      type: "p",
      text: "회사는 관련 법령에 따라 콘텐츠 삭제 또는 접근 제한 조치를 취할 수 있습니다.",
    },
    { type: "p", text: "반복적인 저작권 침해자는 서비스 이용이 제한될 수 있습니다." },
    { type: "hr" },
    { type: "h2", text: "제12조 (서비스 이용 제한)" },
    { type: "p", text: "회사는 약관 또는 정책 위반 시 다음 조치를 취할 수 있습니다." },
    {
      type: "ul",
      items: ["콘텐츠 삭제", "기능 제한", "계정 정지", "계정 영구 삭제"],
    },
    { type: "p", text: "중대한 위반의 경우 사전 통보 없이 조치될 수 있습니다." },
    { type: "hr" },
    { type: "h2", text: "제13조 (서비스 중단)" },
    {
      type: "p",
      text: "회사는 점검, 장애, 보안 문제, 천재지변 또는 기타 사유로 서비스를 일시 중단할 수 있습니다.",
    },
    {
      type: "p",
      text: "회사는 서비스 중단으로 인해 발생한 손해에 대해 법률상 허용되는 범위 내에서 책임을 부담합니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제14조 (면책)" },
    {
      type: "p",
      text: "회사는 사용자가 작성하거나 제공한 콘텐츠에 대해 직접적인 책임을 부담하지 않습니다.",
    },
    {
      type: "p",
      text: "사용자 간 거래, 후원, 구독 또는 분쟁에 대한 책임은 해당 당사자에게 있습니다.",
    },
    { type: "p", text: "회사는 서비스의 무중단 제공을 보장하지 않습니다." },
    { type: "hr" },
    { type: "h2", text: "제15조 (계정 종료)" },
    { type: "p", text: "사용자는 언제든지 계정을 삭제할 수 있습니다. 삭제 요청 절차는 MoCoMo 계정 및 데이터 삭제 안내(/legal/account-deletion)를 따릅니다." },
    {
      type: "p",
      text: "회사는 법령 또는 내부 정책에 따라 일부 정보를 일정 기간 보관할 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제16조 (준거법)" },
    { type: "p", text: "본 약관은 대한민국 법률을 따릅니다." },
    { type: "hr" },
    { type: "h2", text: "제17조 (문의)" },
    { type: "p", text: `고객문의: ${LEGAL_CONTACT_EMAIL}` },
  ],
};

export const CREATOR_TERMS: LegalDocument = {
  slug: "creator-terms",
  title: "MoCoMo 크리에이터 약관",
  updatedAt: "2026년 5월 25일",
  blocks: [
    { type: "h2", text: "제1조 (목적)" },
    {
      type: "p",
      text: "본 약관은 MoCoMo에서 크리에이터 기능을 이용하는 사용자와 회사 간의 권리와 의무를 규정합니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제2조 (크리에이터 자격)" },
    { type: "p", text: "회사는 크리에이터 신청을 승인 또는 거절할 수 있습니다." },
    { type: "p", text: "크리에이터는 정확한 정산 정보를 제공해야 합니다." },
    { type: "hr" },
    { type: "h2", text: "제3조 (콘텐츠 책임)" },
    { type: "p", text: "크리에이터는 자신이 게시한 콘텐츠에 대한 모든 책임을 부담합니다." },
    { type: "p", text: "크리에이터는 필요한 저작권 및 권리를 보유해야 합니다." },
    { type: "hr" },
    { type: "h2", text: "제4조 (수익 정산)" },
    {
      type: "p",
      text: "크리에이터는 구독, 후원, 디지털 콘텐츠 판매 등을 통해 수익을 얻을 수 있습니다.",
    },
    { type: "p", text: "회사는 수수료를 공제한 후 정산할 수 있습니다." },
    { type: "p", text: "정산 일정은 회사 정책에 따릅니다." },
    { type: "hr" },
    { type: "h2", text: "제5조 (금지 행위)" },
    { type: "p", text: "다음 행위는 금지됩니다." },
    {
      type: "ul",
      items: [
        "허위 광고",
        "사기성 판매",
        "저작권 침해 콘텐츠 판매",
        "불법 콘텐츠 판매",
        "결제 우회 유도",
      ],
    },
    { type: "hr" },
    { type: "h2", text: "제6조 (정산 보류)" },
    { type: "p", text: "다음 사유가 있는 경우 정산이 보류될 수 있습니다." },
    {
      type: "ul",
      items: ["결제 분쟁", "환불 분쟁", "약관 위반", "법적 문제"],
    },
    { type: "hr" },
    { type: "h2", text: "제7조 (계정 종료)" },
    { type: "p", text: "정책 위반 시 크리에이터 자격이 제한되거나 박탈될 수 있습니다." },
  ],
};

export const PAYMENT_REFUND_POLICY: LegalDocument = {
  slug: "payment",
  title: "MoCoMo 결제 및 환불 정책",
  updatedAt: "2026년 5월 25일",
  blocks: [
    { type: "h2", text: "제1조 (결제)" },
    {
      type: "p",
      text: "MoCoMo는 신용카드, 체크카드 및 기타 지원되는 결제수단을 통해 결제를 처리할 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제2조 (구독)" },
    { type: "p", text: "구독은 자동 갱신될 수 있습니다." },
    {
      type: "p",
      text: "사용자는 언제든지 다음 결제일부터 적용되는 방식으로 구독을 취소할 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제3조 (디지털 콘텐츠)" },
    { type: "p", text: "다음은 디지털 콘텐츠에 해당합니다." },
    {
      type: "ul",
      items: ["사진", "영상", "음성", "다운로드 파일", "온라인 강의", "기타 전자적 콘텐츠"],
    },
    { type: "hr" },
    { type: "h2", text: "제4조 (환불)" },
    {
      type: "p",
      text: "법령상 환불 의무가 있는 경우를 제외하고 이미 제공되거나 소비된 디지털 콘텐츠는 환불이 제한될 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제5조 (부정 결제)" },
    {
      type: "p",
      text: "도용 카드, 결제 사기, 차지백 악용 등이 확인될 경우 계정 이용이 제한될 수 있습니다.",
    },
    { type: "hr" },
    { type: "h2", text: "제6조 (결제 대행)" },
    { type: "p", text: "결제는 외부 결제 서비스 제공업체를 통해 처리될 수 있습니다." },
  ],
};

export const COPYRIGHT_POLICY: LegalDocument = {
  slug: "copyright",
  title: "MoCoMo 저작권 정책",
  updatedAt: "2026년 5월 25일",
  blocks: [
    { type: "h2", text: "제1조 (저작권 존중)" },
    { type: "p", text: "MoCoMo는 저작권을 존중합니다." },
    { type: "p", text: "사용자는 업로드하는 콘텐츠에 대한 적법한 권리를 보유해야 합니다." },
    { type: "hr" },
    { type: "h2", text: "제2조 (침해 신고)" },
    { type: "p", text: "권리자는 다음 정보를 포함하여 침해 신고를 제출할 수 있습니다." },
    {
      type: "ul",
      items: ["권리자 정보", "침해 콘텐츠 위치", "침해 사실 설명"],
    },
    { type: "hr" },
    { type: "h2", text: "제3조 (조치)" },
    { type: "p", text: "회사는 신고 접수 후 다음 조치를 할 수 있습니다." },
    {
      type: "ul",
      items: ["콘텐츠 삭제", "접근 제한", "계정 제한"],
    },
    { type: "hr" },
    { type: "h2", text: "제4조 (반복 침해)" },
    { type: "p", text: "반복적인 저작권 침해자는 영구 정지될 수 있습니다." },
    { type: "hr" },
    { type: "h2", text: "제5조 (허위 신고)" },
    { type: "p", text: "허위 신고는 제재 대상이 될 수 있습니다." },
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
      text: "사용자는 자신의 개인정보 열람, 수정 및 삭제를 요청할 수 있습니다. 계정 전체 삭제 절차는 MoCoMo 계정 및 데이터 삭제 안내(/legal/account-deletion)를 참고해 주세요.",
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

export const ACCOUNT_DELETION: LegalDocument = {
  slug: "account-deletion",
  title: "MoCoMo 계정 및 데이터 삭제",
  updatedAt: "2026년 6월 17일",
  intro:
    "MoCoMo(모코모) Android 앱 및 웹 서비스 이용자는 언제든지 계정 삭제를 요청할 수 있습니다. 본 페이지는 Google Play 스토어 등록정보에 공개되는 계정·데이터 삭제 안내입니다.",
  blocks: [
    { type: "h2", text: "1. 삭제 요청 방법" },
    {
      type: "p",
      text: "MoCoMo 앱 또는 웹(mocomo.net)에 로그인한 뒤, 가입 시 사용한 이메일 주소로 아래 절차에 따라 삭제를 요청해 주세요.",
    },
    {
      type: "ul",
      items: [
        `1단계: ${LEGAL_CONTACT_EMAIL} 으로 이메일을 보냅니다.`,
        "2단계: 메일 제목에 [MoCoMo 계정 삭제 요청]을 적습니다.",
        "3단계: 본문에 MoCoMo 사용자명(@username), 가입 이메일 주소, 삭제를 원하는 사유를 기재합니다.",
        "4단계: 본인 확인을 위해 가입 이메일과 동일한 주소에서 발송해야 합니다. OAuth(Google·Discord) 가입자도 연결된 이메일로 요청해 주세요.",
        "5단계: 접수 확인 후 영업일 기준 최대 30일 이내 처리 결과를 회신합니다.",
      ],
    },
    { type: "hr" },
    { type: "h2", text: "2. 삭제되는 데이터" },
    {
      type: "p",
      text: "계정 삭제가 완료되면 아래 데이터는 복구할 수 없도록 삭제·비식별 처리됩니다.",
    },
    {
      type: "ul",
      items: [
        "계정 정보(이메일, 사용자명, 프로필, 프로필 사진·배너)",
        "게시물, 댓글, 좋아요, 북마크, 리포스트",
        "DM 및 그룹 채팅 메시지",
        "업로드한 이미지·동영상 등 미디어 파일",
        "팔로우·차단 관계, 알림 설정, 푸시 구독 정보",
        "코스프레·스트리머·애니덕질 등 부가 프로필 데이터",
        "매칭·탐색 설정(거리·취향 필터 등)",
      ],
    },
    { type: "hr" },
    { type: "h2", text: "3. 보관되는 데이터" },
    {
      type: "p",
      text: "관련 법령 또는 분쟁·부정 이용 방지를 위해 아래 정보는 계정 삭제 후에도 일정 기간 보관될 수 있습니다.",
    },
    {
      type: "ul",
      items: [
        "결제·후원·구독·마켓·출금 기록: 전자상거래 등 관련 법령에 따라 최대 5년",
        "세금·정산 및 Stripe·Toss 등 결제 대행사 거래 기록: 법령 및 결제사 정책에 따른 기간",
        "신고·제재·분쟁 처리 기록: 처리 완료 후 최대 1년",
        "접속·보안 로그(IP, 기기 정보 등): 부정 이용 방지 목적으로 최대 90일",
        "법원·수사기관 등 법적 요청이 있는 경우: 요청 범위 내에서 보관",
      ],
    },
    { type: "hr" },
    { type: "h2", text: "4. 삭제 전 확인 사항" },
    {
      type: "ul",
      items: [
        "진행 중인 거래·입찰·출금 신청·구독 결제가 있으면 먼저 완료하거나 해지해 주세요.",
        "크리에이터·판매자 계정은 정산 잔액 출금 후 삭제를 요청하는 것을 권장합니다.",
        "삭제 후 동일 이메일·사용자명으로 재가입할 수 있으나, 이전 데이터는 복구되지 않습니다.",
        "타인과의 채팅방에서 보낸 메시지는 상대방 화면에 남을 수 있으며, 본인 계정 정보는 삭제됩니다.",
      ],
    },
    { type: "hr" },
    { type: "h2", text: "5. 계정 없이 데이터만 삭제" },
    {
      type: "p",
      text: `계정을 유지한 채 특정 개인정보만 삭제·수정하려면 ${LEGAL_CONTACT_EMAIL} 으로 [MoCoMo 데이터 삭제·수정 요청] 제목으로 문의해 주세요. 프로필 수정은 앱 내 설정 → 프로필 수정에서 직접 변경할 수 있습니다.`,
    },
    { type: "hr" },
    { type: "h2", text: "6. 문의" },
    {
      type: "p",
      text: `계정 삭제와 관련해 궁금한 점이 있으면 ${LEGAL_CONTACT_EMAIL} 으로 문의해 주세요.`,
    },
  ],
};

export const LEGAL_PAGES = [
  { href: "/legal/policy", label: "운영원칙 및 이용정책", doc: COMMUNITY_POLICY },
  { href: "/legal/terms", label: "이용약관", doc: TERMS_OF_SERVICE },
  { href: "/legal/creator-terms", label: "크리에이터 약관", doc: CREATOR_TERMS },
  { href: "/legal/payment", label: "결제 및 환불 정책", doc: PAYMENT_REFUND_POLICY },
  { href: "/legal/copyright", label: "저작권 정책", doc: COPYRIGHT_POLICY },
  { href: "/legal/privacy", label: "개인정보처리방침", doc: PRIVACY_POLICY },
  { href: "/legal/account-deletion", label: "계정 및 데이터 삭제", doc: ACCOUNT_DELETION },
] as const;
