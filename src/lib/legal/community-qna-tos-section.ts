import type { LegalBlock } from "@/lib/legal-content";

const LEGAL_ENTITY_NAME = "MoCoMo LLC";
const LEGAL_CONTACT_EMAIL = "support@mocomo.net";

/** Article 13 — User-Generated Content and Q&A (English governing text). */
export const COMMUNITY_QNA_TOS_BLOCKS: LegalBlock[] = [
  {
    type: "p",
    text: `The Q&A Feature (including community questions, answers, comments, media attachments, votes, and related metadata) is part of the Service operated by ${LEGAL_ENTITY_NAME}, a Wyoming limited liability company. By accessing, posting a question, submitting an answer, or otherwise using the Q&A Feature, you agree to this Article in addition to the rest of these Terms of Service.`,
  },
  { type: "h3", text: "13.1 Nature of the Q&A Feature" },
  {
    type: "p",
    text: "The Q&A Feature enables users to post questions and allows other users—who may or may not hold professional licenses or credentials—to post responses. MoCoMo does not verify user identity, qualifications, credentials, or the accuracy of any response. MoCoMo is not a party to any communication or exchange between users and does not endorse any question, answer, or user.",
  },
  { type: "h3", text: "13.2 Disclaimer of Warranties (Q&A and UGC)" },
  {
    type: "p",
    text: "THE Q&A FEATURE AND ALL USER-GENERATED CONTENT (INCLUDING QUESTIONS, ANSWERS, COMMENTS, LINKS, IMAGES, AUDIO, VIDEO, AND AI-ASSISTED OR AUTOMATED CONTENT) ARE PROVIDED ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MOCOMO LLC AND ITS MEMBERS, MANAGERS, OFFICERS, EMPLOYEES, AGENTS, AFFILIATES, SUCCESSORS, AND ASSIGNS (COLLECTIVELY, THE \"COMPANY PARTIES\") EXPRESSLY DISCLAIM ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, COMPLETENESS, RELIABILITY, TIMELINESS, SAFETY, OR AVAILABILITY. THE COMPANY PARTIES DO NOT WARRANT THAT ANY ANSWER OR OTHER UGC IS CORRECT, CURRENT, COMPLETE, SAFE, LAWFUL, OR SUITABLE FOR YOUR PURPOSE. YOU BEAR SOLE RESPONSIBILITY FOR EVALUATING AND USING ANY UGC.",
  },
  { type: "h3", text: "13.3 No Professional Advice; No Professional Relationship" },
  {
    type: "p",
    text: "CONTENT ON THE Q&A FEATURE IS FOR GENERAL INFORMATION AND COMMUNITY DISCUSSION ONLY. NOTHING POSTED ON OR THROUGH THE Q&A FEATURE CONSTITUTES LEGAL, MEDICAL, MENTAL HEALTH, FINANCIAL, TAX, INVESTMENT, INSURANCE, ENGINEERING, OR ANY OTHER PROFESSIONAL ADVICE. MOCOMO DOES NOT PROVIDE PROFESSIONAL SERVICES. USE OF THE Q&A FEATURE DOES NOT CREATE AN ATTORNEY-CLIENT, DOCTOR-PATIENT, THERAPIST-PATIENT, FIDUCIARY, OR OTHER PROFESSIONAL-CLIENT RELATIONSHIP BETWEEN YOU AND MOCOMO OR BETWEEN YOU AND ANY OTHER USER. IF YOU NEED PROFESSIONAL ADVICE, CONSULT A QUALIFIED PROFESSIONAL LICENSED IN YOUR JURISDICTION. YOU RELY ON ANY INFORMATION OBTAINED THROUGH THE Q&A FEATURE AT YOUR OWN RISK.",
  },
  { type: "h3", text: "13.4 Interactive Computer Service; Section 230" },
  {
    type: "p",
    text: "MoCoMo provides the Q&A Feature as an interactive computer service and hosting platform under Section 230 of the Communications Decency Act (47 U.S.C. § 230) and analogous laws where applicable. MoCoMo is not the publisher or speaker of user-generated content posted by users. MoCoMo does not pre-screen all Q&A content and has no obligation to monitor UGC. MoCoMo may remove, restrict, or disable access to Q&A content that violates these Terms, applicable law, or our policies, or that we deem harmful or inappropriate, with or without notice. Nothing in this Article limits MoCoMo's ability to moderate the Service or cooperate with law enforcement as described elsewhere in these Terms.",
  },
  { type: "h3", text: "13.5 User Responsibility; Indemnification" },
  {
    type: "p",
    text: "You are solely responsible for all content you post, upload, transmit, or otherwise make available through the Q&A Feature, and for any consequences arising from your content or conduct. You represent and warrant that you have all rights necessary to post your content and that your content does not violate any law or third-party rights.",
  },
  {
    type: "p",
    text: `You agree to defend, indemnify, and hold harmless the Company Parties from and against any and all claims, demands, actions, proceedings, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees and court costs) arising out of or relating to: (a) your UGC or use of the Q&A Feature; (b) your violation of these Terms or applicable law; (c) your infringement or misappropriation of any intellectual property, privacy, publicity, or other rights; or (d) any harm alleged to have been caused by your content or conduct. MoCoMo may assume exclusive defense and control of any matter subject to indemnification at your expense, and you agree to cooperate fully. Send indemnity-related notices to ${LEGAL_CONTACT_EMAIL}.`,
  },
  { type: "h3", text: "13.6 License Grant to MoCoMo" },
  {
    type: "p",
    text: "By posting a question, answer, comment, or other content in the Q&A Feature, you grant MoCoMo a worldwide, perpetual, irrevocable, royalty-free, fully paid-up, non-exclusive, sublicensable, and transferable license to use, host, store, reproduce, modify, adapt, translate, create derivative works from, publish, publicly perform, publicly display, distribute, and otherwise exploit such content in connection with operating, providing, promoting, improving, and securing the Service (including in aggregated or anonymized form), in any media now known or later developed, without compensation to you. You retain ownership of your content subject to this license and the rights of other users and the public as provided in these Terms. To the extent any moral rights apply, you waive them to the maximum extent permitted by law.",
  },
  { type: "h3", text: "13.7 Limitation of Liability (Q&A Feature)" },
  {
    type: "p",
    text: "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY PARTIES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO THE Q&A FEATURE OR ANY UGC THEREON, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, EVEN IF MOCOMO HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. WITHOUT LIMITING THE FOREGOING, MOCOMO SHALL NOT BE LIABLE FOR ANY ACTS OR OMISSIONS OF USERS, FOR RELIANCE ON ANY ANSWER OR UGC, OR FOR OFF-PLATFORM CONDUCT ARISING FROM Q&A INTERACTIONS. WHERE LIABILITY CANNOT BE FULLY EXCLUDED, THE COMPANY PARTIES' TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE Q&A FEATURE SHALL NOT EXCEED THE GREATER OF (I) ONE HUNDRED U.S. DOLLARS (US $100) OR (II) THE AMOUNT YOU PAID TO MOCOMO FOR THE SERVICE IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN SUCH CASES, THE ABOVE LIMITATIONS APPLY TO THE FULLEST EXTENT PERMITTED BY LAW.",
  },
  { type: "h3", text: "13.8 Governing Law and Exclusive Jurisdiction (Q&A Feature)" },
  {
    type: "p",
    text: "Except as provided in Section 13.9 below for arbitration, any dispute, claim, or controversy arising out of or relating to the Q&A Feature or this Article shall be governed by the laws of the State of Wyoming, United States of America, without regard to its conflict-of-law principles that would require application of another jurisdiction's laws. Subject to Section 13.9, you and MoCoMo consent to the exclusive jurisdiction and venue of the state courts located in Wyoming and the federal courts located in Wyoming for any permitted court proceeding not subject to arbitration.",
  },
  { type: "h3", text: "13.9 Mandatory Binding Arbitration and Class Action Waiver" },
  {
    type: "p",
    text: "PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT AND TO HAVE A JURY TRIAL.",
  },
  {
    type: "p",
    text: `(a) Agreement to Arbitrate. Except for disputes that qualify for small claims court or injunctive relief regarding intellectual property or unauthorized access as MoCoMo may elect to bring in court, any dispute, claim, or controversy arising out of or relating to the Q&A Feature, UGC posted therein, or this Article (a "Q&A Dispute") shall be resolved exclusively through final and binding arbitration administered by the American Arbitration Association ("AAA") under its Consumer Arbitration Rules (or, if you are not a consumer, the Commercial Arbitration Rules), as modified by this Article. The Federal Arbitration Act (9 U.S.C. §§ 1–16) governs the interpretation and enforcement of this arbitration agreement.`,
  },
  {
    type: "p",
    text: "(b) Individual Proceedings Only; Class Waiver. YOU AND MOCOMO AGREE THAT EACH MAY BRING Q&A DISPUTES AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING. THE ARBITRATOR MAY NOT CONSOLIDATE MORE THAN ONE PERSON'S CLAIMS OR PRESIDE OVER ANY FORM OF CLASS OR REPRESENTATIVE PROCEEDING. If this class waiver is found unenforceable, the entirety of this Section 13.9 shall be null and void, and Q&A Disputes shall be resolved in court as set forth in Section 13.8.",
  },
  {
    type: "p",
    text: "(c) Procedure. Before filing arbitration, you must send a written Notice of Dispute to MoCoMo at the contact address in these Terms, describing the claim and relief sought. If the Q&A Dispute is not resolved within sixty (60) days after receipt, either party may commence arbitration. Arbitration may be conducted by videoconference or, if in-person hearing is required, in Wyoming unless otherwise agreed. The arbitrator's award shall be final and binding and may be entered in any court of competent jurisdiction.",
  },
  {
    type: "p",
    text: "(d) Opt-Out. You may opt out of this arbitration agreement within thirty (30) days of first accepting these Terms by sending a written opt-out notice to MoCoMo with your name, account email, and a clear statement that you opt out of Q&A arbitration. If you opt out, Section 13.8 shall govern disputes to the extent permitted by law.",
  },
  {
    type: "p",
    text: "(e) Conflict. For Q&A Disputes, this Article 13 controls over any conflicting dispute-resolution provision elsewhere in these Terms. For all other disputes, the general governing-law and dispute provisions of these Terms apply.",
  },
];

/** Korean summary for the main Terms (same article number). */
export const COMMUNITY_QNA_TOS_BLOCKS_KO: LegalBlock[] = [
  {
    type: "p",
    text: "커뮤니티 Q&A(질문·답변·댓글·첨부 미디어 등) 기능을 이용하면 본 조 및 아래 영문 조항에 동의한 것으로 간주됩니다. 답변 작성자는 전문가가 아닐 수 있으며, 회사는 답변의 정확성·완전성·안전성을 보증하지 않습니다.",
  },
  {
    type: "p",
    text: "Q&A 콘텐츠는 법률·의료·재정 등 전문적 조언이 아니며, 전문가-의뢰인 관계가 성립하지 않습니다. 이용자는 Q&A 정보를 전적으로 본인 책임 하에 사용합니다. 회사는 CDA §230에 따른 상호작용 컴퓨터 서비스 제공자로서 이용자 게시 콘텐츠의 발행자·화자가 아닙니다.",
  },
  {
    type: "p",
    text: "이용자는 본인이 게시한 Q&A 콘텐츠에 대한 책임을 부담하며, 제3자 청구로 인한 회사 손해에 대해 면책·배상에 동의합니다. Q&A 게시 시 회사에 전 세계적·영구적·무상·재라이선스 가능·양도 가능한 이용 허락을 부여합니다. Q&A 관련 간접·특별·결과·징벌적 손해에 대한 회사 책임은 관련 법령이 허용하는 최대 한도 내에서 제한됩니다.",
  },
  {
    type: "p",
    text: "Q&A 관련 분쟁의 준거법은 미국 와이오밍 주법이며, 본 조 13.9항에 따라 AAA 중재 및 집단소송·집단중재 포기가 적용될 수 있습니다. Q&A 분쟁에 관하여 본 조와 다른 약관 조항이 충돌하는 경우 본 조가 우선합니다.",
  },
];
