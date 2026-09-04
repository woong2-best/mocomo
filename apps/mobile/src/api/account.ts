import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type AccountDeletionPayload = {
  confirmUsername: string;
  confirmDelete: string;
  password?: string;
  reason?: string;
};

export type AccountDeletionResult = {
  success: true;
  recoveryUntil: string;
  message: string;
};

export async function requestAccountDeletion(payload: AccountDeletionPayload) {
  return apiRequest<AccountDeletionResult>(MobileApi.accountDelete, {
    method: "POST",
    auth: true,
    body: payload,
  });
}
