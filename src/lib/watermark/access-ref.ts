/**
 * The access reference is mixed into the watermark payload at embed time and
 * recomputed at detection time. If the two ever derive it differently the
 * codeword will not match and a leaked file becomes unattributable, silently.
 * Both sides must call this — never inline the fallback chain.
 */
export type WatermarkAccessRefInput = {
  purchaseId?: string | null;
  episodePurchaseId?: string | null;
  messageAttachmentPurchaseId?: string | null;
  subscriptionId?: string | null;
};

export function watermarkAccessRef(input: WatermarkAccessRefInput): string {
  return (
    input.purchaseId ??
    input.episodePurchaseId ??
    input.messageAttachmentPurchaseId ??
    `sub:${input.subscriptionId}`
  );
}
