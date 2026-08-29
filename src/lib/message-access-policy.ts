/**
 * Messenger data access policy (Stripe / law-enforcement defense).
 *
 * - Message bodies are stored for delivery between room members only.
 * - Routine operator/admin UI must not browse DM content; no admin message viewer exists.
 * - Off-platform payment/contact keywords are masked automatically without human review
 *   (see chat-content-filter.ts).
 * - Lawful disclosure requires documented legal process and SiteAdminAuditLog
 *   (action: LEGAL_MESSAGE_EXPORT).
 */

export const MESSAGE_LEGAL_EXPORT_AUDIT_ACTION = "LEGAL_MESSAGE_EXPORT" as const;
