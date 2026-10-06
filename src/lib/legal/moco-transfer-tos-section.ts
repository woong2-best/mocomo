import type { LegalBlock } from "@/lib/legal-content";

/** Article 22 — MOCO Transfers / ATM (English governing text). */
export const MOCO_TRANSFER_TOS_BLOCKS: LegalBlock[] = [
  {
    type: "p",
    text: 'This Section governs MOCO Transfers on the Service, including the ATM Transfer feature. The English text below is the governing language for Transfers to the extent permitted by applicable law.',
  },
  { type: "h3", text: "22.1 Transfers" },
  {
    type: "p",
    text: 'Users may send MOCO to other users on the Service ("Transfer"). Each Transfer is a voluntary gift and support ("Support") from the sender to the recipient. The transferred amount is recorded as the recipient\'s earnings and does not increase the recipient\'s own spendable MOCO balance.',
  },
  { type: "h3", text: "22.2 Source of Funds" },
  {
    type: "p",
    text: "MOCO sent in a Transfer is deducted from the sender's purchased (paid) MOCO balance.",
  },
  { type: "h3", text: "22.3 Final and Non-Refundable" },
  {
    type: "p",
    text: "Once a Transfer is completed, it is final. Sent MOCO is treated as Support and cannot be refunded, reversed, or recalled by the sender.",
  },
  { type: "h3", text: "22.4 Prohibited Content" },
  {
    type: "p",
    text: "Any message, note, or content attached to a Transfer must not contain profanity, harassment, hate speech, discrimination, sexual or obscene content, threats, defamation, or any unlawful content.",
  },
  { type: "h3", text: "22.5 Legal Responsibility" },
  {
    type: "p",
    text: "Senders are solely responsible for the content they send. Violations may result in civil or criminal liability under applicable law. MoCoMo LLC may disclose relevant information to authorities where required by law.",
  },
  { type: "h3", text: "22.6 Enforcement" },
  {
    type: "p",
    text: "MoCoMo LLC may, at its discretion, hide or delete violating content, suspend or restrict Transfer functions, freeze or cancel the related MOCO, and suspend or terminate accounts, with or without prior notice. MOCO that is frozen or cancelled due to a violation is not refundable.",
  },
  { type: "h3", text: "22.7 Acceptance" },
  {
    type: "p",
    text: 'By clicking "Send" to complete a Transfer, the sender confirms that they have read and agree to these Terms, including this Section.',
  },
  { type: "h3", text: "22.8 Eligibility" },
  {
    type: "p",
    text: "To use Transfers, users must provide an accurate date of birth. Regardless of country or jurisdiction, only users who are at least 18 years old may send Transfers. Users who are under 18 but otherwise permitted to use the Service may receive Transfers. Users who misrepresent their age are solely responsible for any resulting consequences, and MoCoMo LLC may suspend or terminate their accounts and restrict related functions.",
  },
];

/** Korean summary for the main Terms (same article number). */
export const MOCO_TRANSFER_TOS_BLOCKS_KO: LegalBlock[] = [
  {
    type: "p",
    text: '이용자는 서비스의 ATM 전송 기능을 통해 다른 이용자에게 MOCO를 보낼 수 있습니다(이하 "전송"). 각 전송은 발신자가 수신자에게 하는 자발적 선물·후원(Support)이며, 전송액은 수신자의 수익(earnings)에 즉시 반영되고 수신자의 사용 가능 MOCO 잔액은 증가하지 않습니다.',
  },
  {
    type: "p",
    text: "전송에 사용되는 MOCO는 발신자의 유상 구매 MOCO 잔액에서 차감됩니다. 전송이 완료되면 확정되며, 후원으로 취급되어 발신자가 환불·취소·회수할 수 없습니다.",
  },
  {
    type: "p",
    text: "전송에 첨부하는 편지·메모·콘텐츠에는 욕설, 괴롭힘, 혐오 발언, 차별, 성적·음란 내용, 협박, 명예훼손 또는 위법한 내용을 포함할 수 없습니다. 발신자는 자신이 보낸 내용에 대해 전적인 책임을 지며, 위반 시 관련 법령에 따른 민·형사상 책임이 발생할 수 있습니다. 회사는 법령이 요구하는 경우 관련 정보를 수사기관 등에 제공할 수 있습니다.",
  },
  {
    type: "p",
    text: "회사는 재량에 따라 위반 콘텐츠를 숨기거나 삭제하고, 전송 기능을 정지·제한하며, 관련 MOCO를 동결·취소하고, 사전 통지 없이 계정을 정지·해지할 수 있습니다. 위반으로 동결되거나 취소된 MOCO는 환불되지 않습니다.",
  },
  {
    type: "p",
    text: '전송을 완료하기 위해 "보내기(Send)"를 누르면 발신자는 본 조를 포함한 이용약관을 읽고 동의한 것으로 확인됩니다.',
  },
  {
    type: "p",
    text: "전송을 이용하려면 정확한 생년월일을 제공해야 합니다. 국가·관할과 관계없이 만 18세 이상만 전송을 보낼 수 있습니다. 만 18세 미만이더라도 서비스 이용이 허용된 이용자는 전송을 받을 수 있습니다. 나이를 허위로 기재한 이용자는 그로 인한 결과에 대해 전적인 책임을 지며, 회사는 계정을 정지·해지하고 관련 기능을 제한할 수 있습니다.",
  },
];
