import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { fetchAdultVerificationStatus } from "@/api/adult-verification";
import {
  ADULT_VERIFICATION_REQUIRED_MSG,
  type AdultVerificationScope,
} from "@/lib/adult-verification-messages";
import { openAdultVerificationSession } from "@/lib/open-adult-verification";

export function useAdultVerificationGate(scope: AdultVerificationScope = "DM_PAID") {
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const status = await fetchAdultVerificationStatus();
    setIsAdult(status.isAdult);
    return status.isAdult;
  }, []);

  const runVerification = useCallback(async () => {
    setBusy(true);
    try {
      await openAdultVerificationSession(scope);
      setIsAdult(true);
      return true;
    } finally {
      setBusy(false);
    }
  }, [scope]);

  const ensureAdult = useCallback(async (): Promise<boolean> => {
    try {
      const ok = isAdult ?? (await refresh());
      if (ok) return true;
    } catch {
      /* status fetch failed — still offer verification */
    }

    return new Promise((resolve) => {
      Alert.alert("본인인증 필요", ADULT_VERIFICATION_REQUIRED_MSG, [
        { text: "취소", style: "cancel", onPress: () => resolve(false) },
        {
          text: "본인인증 시작",
          onPress: () => {
            void runVerification()
              .then(() => resolve(true))
              .catch((e) => {
                Alert.alert(
                  "인증 실패",
                  e instanceof Error ? e.message : "본인인증에 실패했습니다."
                );
                resolve(false);
              });
          },
        },
      ]);
    });
  }, [isAdult, refresh, runVerification]);

  return { isAdult, busy, ensureAdult, refresh, runVerification };
}
