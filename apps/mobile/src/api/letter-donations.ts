import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export async function sendLetterDonation(input: {
  receiverId: string;
  roomId: string;
  moco: number;
  message: string;
}) {
  return apiRequest<{ ok: true; tipId: string; moco: number; balance: number }>(
    MobileApi.letterDonations,
    {
      method: "POST",
      body: input,
      auth: true,
    }
  );
}
