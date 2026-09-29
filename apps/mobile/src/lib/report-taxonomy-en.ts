/** English copy for post report flow — keep structure in sync with report-reasons.ts */
import type { ReportReasonId, ReportTaxonomyNode } from "@/lib/report-taxonomy";

export const REPORT_REASONS_EN: { id: ReportReasonId; label: string }[] = [
  { id: "SPAM", label: "Spam · ads" },
  { id: "ABUSE", label: "Abuse · harassment" },
  { id: "HARASSMENT", label: "Harassment" },
  { id: "HATE", label: "Hate speech" },
  { id: "VIOLENCE", label: "Violence" },
  { id: "FRAUD", label: "Fraud · illegal trade" },
  { id: "PRIVACY", label: "Privacy" },
  { id: "COPYRIGHT", label: "Copyright" },
  { id: "SEXUAL", label: "Sexual content" },
  { id: "IMPERSONATION", label: "Impersonation" },
  { id: "SELF_HARM", label: "Self-harm" },
  { id: "FALSE_INFO", label: "False information" },
  { id: "UNDERAGE", label: "Underage-related" },
  { id: "POLITICAL", label: "Political misinformation" },
  { id: "REGULATED", label: "Regulated goods" },
  { id: "OTHER", label: "Other" },
];

export const POST_REPORT_ROOT_QUESTION_EN =
  "Why are you reporting this post?";

export const POST_REPORT_DISCLAIMER_EN =
  "Reports are reviewed by the MoCoMo team. Your identity is kept confidential.";

export const POST_REPORT_REVIEW_HINT_EN =
  "Review follows the MoCoMo Community Guidelines.";

export const POST_REPORT_OTHER_DETAILS_PROMPT_EN =
  "Tell us more about the issue.";

export const POST_REPORT_TAXONOMY_EN: ReportTaxonomyNode[] = [
  {
    id: "spam_fraud",
    label: "Spam / illegal promotion / scam",
    childQuestion: "Which best describes the problem?",
    children: [
      {
        id: "scam_false",
        label: "False or scam",
        childQuestion: "What kind of scam?",
        children: [
          { id: "scam_finance", label: "Financial or identity scam", reasonId: "FRAUD" },
          {
            id: "scam_celeb_endorse",
            label: "Celebrity impersonation · false endorsement",
            reasonId: "IMPERSONATION",
          },
          {
            id: "scam_misleading",
            label: "Misleading product or service",
            reasonId: "FRAUD",
          },
          { id: "scam_gambling", label: "Gambling scam", reasonId: "FRAUD" },
        ],
      },
      {
        id: "scam_impersonation",
        label: "Impersonation",
        childQuestion: "What type of impersonation?",
        children: [
          {
            id: "scam_fake_account",
            label: "Fake account · brand impersonation",
            reasonId: "IMPERSONATION",
          },
          {
            id: "scam_celeb_fake",
            label: "Celebrity impersonation · false endorsement",
            reasonId: "IMPERSONATION",
          },
        ],
      },
      { id: "scam_spam", label: "Spam · repeated promotion", reasonId: "SPAM" },
      {
        id: "regulated",
        label: "Sale or promotion of regulated items",
        childQuestion: "What is being sold or promoted?",
        children: [
          {
            id: "regulated_drugs",
            label: "Drugs",
            childQuestion: "What kind of drugs?",
            children: [
              {
                id: "regulated_drugs_hard",
                label: "High-risk drugs (e.g. cocaine, heroin, fentanyl)",
                reasonId: "REGULATED",
              },
              { id: "regulated_drugs_rx", label: "Prescription drugs", reasonId: "REGULATED" },
              {
                id: "regulated_drugs_other",
                label: "Other illegal or dangerous drugs",
                reasonId: "REGULATED",
              },
            ],
          },
          { id: "regulated_weapons", label: "Firearms · weapons", reasonId: "REGULATED" },
          { id: "regulated_animals", label: "Animals", reasonId: "REGULATED" },
        ],
      },
    ],
  },
  {
    id: "abuse_hate",
    label: "Abuse / defamation / hate / violence",
    childQuestion: "What type of issue?",
    children: [
      {
        id: "profanity_defamation",
        label: "Profanity or defamation",
        childQuestion: "Who is it directed at?",
        children: [
          { id: "defame_user", label: "A specific user · account", reasonId: "ABUSE" },
          { id: "defame_group", label: "A group · minority", reasonId: "HATE" },
          {
            id: "defame_author",
            label: "Directed at the post or comment author",
            reasonId: "HARASSMENT",
          },
          { id: "defame_unspecified", label: "Unspecified or other", reasonId: "ABUSE" },
        ],
      },
      {
        id: "violence",
        label: "Violence · hate or abuse",
        childQuestion: "What type?",
        children: [
          { id: "violence_threat", label: "Violence threat or incitement", reasonId: "VIOLENCE" },
          { id: "violence_hate", label: "Hate speech", reasonId: "HATE" },
          { id: "violence_abuse", label: "Abuse · cruelty", reasonId: "ABUSE" },
        ],
      },
      {
        id: "bullying",
        label: "Bullying or unwanted contact",
        childQuestion: "What type?",
        children: [
          { id: "bullying_harass", label: "Harassment · bullying", reasonId: "HARASSMENT" },
          {
            id: "bullying_unwanted",
            label: "Unwanted contact · stalking",
            reasonId: "HARASSMENT",
          },
        ],
      },
      { id: "self_harm", label: "Suicide or self-harm", reasonId: "SELF_HARM" },
    ],
  },
  {
    id: "sexual",
    label: "Adult / sexual content",
    childQuestion: "What type of sexual content issue?",
    children: [
      {
        id: "adult_nsfw_unmarked",
        label: "Adult post without NSFW label",
        reasonId: "SEXUAL",
      },
      {
        id: "adult_minor_target",
        label: "Sexual content targeting minors",
        reasonId: "UNDERAGE",
      },
      {
        id: "adult_threat_share",
        label: "Threat to share intimate content",
        reasonId: "SEXUAL",
      },
      { id: "adult_sex_work", label: "Appears to be sex work", reasonId: "SEXUAL" },
      { id: "adult_abuse", label: "Appears to be sexual abuse", reasonId: "SEXUAL" },
      {
        id: "underage_safety",
        label: "Issue involving users under 18 (non-sexual)",
        reasonId: "UNDERAGE",
      },
    ],
  },
  {
    id: "privacy_ip",
    label: "Privacy or intellectual property",
    childQuestion: "What type?",
    children: [
      { id: "bullying_privacy", label: "Sharing private information", reasonId: "PRIVACY" },
      { id: "ip", label: "Copyright · IP infringement", reasonId: "COPYRIGHT" },
    ],
  },
  {
    id: "false_info",
    label: "False or misleading information",
    childQuestion: "What type of false information?",
    children: [
      { id: "false_info_general", label: "Health · safety misinformation", reasonId: "FALSE_INFO" },
      { id: "false_info_other", label: "Other false or misleading info", reasonId: "FALSE_INFO" },
    ],
  },
  {
    id: "other",
    label: "Something else",
    reasonId: "OTHER",
    requiresDetails: true,
  },
];
