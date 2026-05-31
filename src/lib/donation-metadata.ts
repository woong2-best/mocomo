/** 후원(TIP) 결제 메타데이터 */

export type TipPaymentMetadata = {
  receiverId: string;
  message?: string;
  username?: string;
  channelId?: string;
  returnPath?: string;
};

export function tipMetadataForCheckout(input: {
  receiverId: string;
  message?: string;
  username?: string;
  channelId?: string;
  returnPath?: string;
}): TipPaymentMetadata {
  const meta: TipPaymentMetadata = { receiverId: input.receiverId };
  const msg = input.message?.trim();
  if (msg) meta.message = msg.slice(0, 200);
  if (input.username?.trim()) meta.username = input.username.trim();
  if (input.channelId?.trim()) meta.channelId = input.channelId.trim();
  if (input.returnPath?.startsWith("/")) meta.returnPath = input.returnPath.trim();
  return meta;
}

export function safeReturnPath(path: string | undefined, fallback = "/support"): string {
  if (!path?.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  return path;
}
