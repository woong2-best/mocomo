import { NextResponse } from "next/server";
import {
  assertFirstPartyLiveEnabled,
  firstPartyLiveDisabledResponse,
} from "@/lib/live-feature";

/** Route handlers — 자체 송출 ingest/playback API 차단 */
export function rejectIfFirstPartyLiveDisabled(): NextResponse | null {
  const gate = assertFirstPartyLiveEnabled();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error, firstPartyLiveDisabled: true },
      { status: 503 }
    );
  }
  return null;
}

export { assertFirstPartyLiveEnabled, firstPartyLiveDisabledResponse };
