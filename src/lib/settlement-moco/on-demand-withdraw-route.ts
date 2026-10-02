import { NextResponse } from "next/server";
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  failIdempotentRequest,
} from "@/lib/api-idempotency";
import { executeOnDemandWithdrawal } from "@/lib/settlement-moco/on-demand-withdrawal";

export const ON_DEMAND_WITHDRAW_IDEMPOTENCY_SCOPE = "settlement_on_demand_withdraw";

export async function handleOnDemandWithdrawPost(
  userId: string,
  withdrawMoco: number,
  idempotencyKey: string | null,
) {
  const key = idempotencyKey?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "X-Idempotency-Key header is required.", code: "IDEMPOTENCY_KEY_REQUIRED" },
      { status: 400 },
    );
  }

  const begin = await beginIdempotentRequest({
    scope: ON_DEMAND_WITHDRAW_IDEMPOTENCY_SCOPE,
    userId,
    idempotencyKey: key,
  });

  if (begin.action === "conflict") {
    return NextResponse.json(
      { error: "Withdrawal is already processing.", code: "IDEMPOTENCY_CONFLICT" },
      { status: 409 },
    );
  }
  if (begin.action === "replay") {
    return NextResponse.json(begin.body, { status: begin.statusCode });
  }

  const result = await executeOnDemandWithdrawal(userId, withdrawMoco, { idempotencyKey: key });

  if (!result.ok) {
    await failIdempotentRequest(begin.recordId);
    return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
  }

  const payload = {
    withdrawalId: result.withdrawalId,
    stripeTransferId: result.stripeTransferId,
  };

  await completeIdempotentRequest(begin.recordId, {
    status: "COMPLETED",
    responseCode: 200,
    responseBody: payload,
  });

  return NextResponse.json(payload);
}
