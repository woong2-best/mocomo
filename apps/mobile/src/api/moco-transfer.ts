import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type MocoTransferResult = {
  success: true;
  amount: number;
  recipientUsername: string;
  recipientName: string;
  senderPurchasedAfter: number;
  recipientSettlementAfter: number;
};

export async function transferMoco(
  username: string,
  amount: number,
  message?: string,
  transferTermsAccepted?: boolean
) {
  return apiRequest<MocoTransferResult>(MobileApi.walletTransfer, {
    method: "POST",
    body: {
      username,
      amount,
      message: message?.trim() || undefined,
      transferTermsAccepted: true,
    },
    auth: true,
  });
}
