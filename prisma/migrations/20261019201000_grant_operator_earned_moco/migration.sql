-- One-time +100 earned MOCO (settlement balance) for operator mocomocompany.
-- Purchased MOCO is not changed. Re-running this statement is a no-op.

DO $$
DECLARE
  v_user_id text;
  v_wallet_id text;
  v_before int;
  v_after int;
  v_old_min int;
  v_new_min int;
BEGIN
  SELECT id INTO v_user_id
  FROM "User"
  WHERE lower(username) = 'mocomocompany'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PlatformWalletLedger" l
    JOIN "PlatformWallet" w ON w.id = l."walletId"
    WHERE w."userId" = v_user_id
      AND l."referenceType" = 'ops_earned_moco_grant'
      AND l."referenceId" = '20261019-mocomocompany-100'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO "PlatformWallet" (
    "id",
    "userId",
    "settlementMocoPoints",
    "createdAt",
    "updatedAt"
  ) VALUES (
    'ops-earned-moco-mocomocompany',
    v_user_id,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("userId") DO NOTHING;

  SELECT id, "settlementMocoPoints"
  INTO v_wallet_id, v_before
  FROM "PlatformWallet"
  WHERE "userId" = v_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN;
  END IF;

  v_after := COALESCE(v_before, 0) + 100;

  UPDATE "PlatformWallet"
  SET "settlementMocoPoints" = v_after,
      "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = v_wallet_id;

  INSERT INTO "PlatformWalletLedger" (
    "id",
    "walletId",
    "bucket",
    "delta",
    "balanceAfter",
    "reason",
    "referenceType",
    "referenceId",
    "createdAt"
  ) VALUES (
    'ops-earned-moco-mocomocompany-100',
    v_wallet_id,
    'SETTLEMENT_MOCO',
    100,
    v_after,
    'Ops earned MOCO grant',
    'ops_earned_moco_grant',
    '20261019-mocomocompany-100',
    CURRENT_TIMESTAMP
  );

  v_new_min := CASE
    WHEN v_after >= 7000 THEN 7000
    WHEN v_after >= 6500 THEN 6500
    WHEN v_after >= 6000 THEN 6000
    WHEN v_after >= 5500 THEN 5500
    WHEN v_after >= 5000 THEN 5000
    WHEN v_after >= 4500 THEN 4500
    WHEN v_after >= 4000 THEN 4000
    WHEN v_after >= 3500 THEN 3500
    WHEN v_after >= 3000 THEN 3000
    WHEN v_after >= 2500 THEN 2500
    WHEN v_after >= 2000 THEN 2000
    WHEN v_after >= 1500 THEN 1500
    WHEN v_after >= 1000 THEN 1000
    WHEN v_after >= 500 THEN 500
    WHEN v_after >= 100 THEN 100
    WHEN v_after >= 50 THEN 50
    WHEN v_after >= 10 THEN 10
    ELSE 0
  END;

  SELECT CASE "earnedMocoTier"::text
    WHEN 'COSMIC' THEN 7000
    WHEN 'ASTRAL' THEN 6500
    WHEN 'JUPITER' THEN 6000
    WHEN 'TERRA' THEN 5500
    WHEN 'LUNA' THEN 5000
    WHEN 'ORICHALCUM' THEN 4500
    WHEN 'MYTHRIL' THEN 4000
    WHEN 'DIAMOND' THEN 3500
    WHEN 'RUBY' THEN 3000
    WHEN 'SAPPHIRE' THEN 2500
    WHEN 'EMERALD' THEN 2000
    WHEN 'CRYSTAL' THEN 1500
    WHEN 'GOLD' THEN 1000
    WHEN 'SILVER' THEN 500
    WHEN 'BRONZE' THEN 100
    WHEN 'BRASS' THEN 50
    WHEN 'STONE' THEN 10
    ELSE 0
  END
  INTO v_old_min
  FROM "User"
  WHERE id = v_user_id;

  IF v_new_min >= COALESCE(v_old_min, 0) THEN
    UPDATE "User"
    SET "earnedMocoTier" = (
      CASE v_new_min
        WHEN 7000 THEN 'COSMIC'
        WHEN 6500 THEN 'ASTRAL'
        WHEN 6000 THEN 'JUPITER'
        WHEN 5500 THEN 'TERRA'
        WHEN 5000 THEN 'LUNA'
        WHEN 4500 THEN 'ORICHALCUM'
        WHEN 4000 THEN 'MYTHRIL'
        WHEN 3500 THEN 'DIAMOND'
        WHEN 3000 THEN 'RUBY'
        WHEN 2500 THEN 'SAPPHIRE'
        WHEN 2000 THEN 'EMERALD'
        WHEN 1500 THEN 'CRYSTAL'
        WHEN 1000 THEN 'GOLD'
        WHEN 500 THEN 'SILVER'
        WHEN 100 THEN 'BRONZE'
        WHEN 50 THEN 'BRASS'
        WHEN 10 THEN 'STONE'
        ELSE 'SEED'
      END
    )::"SupportTierLevel"
    WHERE id = v_user_id;
  END IF;
END $$;

-- Align already published legal copy with tier payouts. No terms popup.
UPDATE "legal_document_revision"
SET
  "bodyText" = replace(
    "bodyText",
    $old$네. 정산 계좌 등록(Stripe Connect)이 완료되고 최소 지급 기준·정산 등급 조건을 충족하면, 별도 출금 신청 없이 매월 지정 일정(매월 1일 정산 배치)에 따라 Reward가 자동 지급됩니다. 계좌 미등록, 본인 확인 미완료, 최소 금액 미달, 분쟁·약관 위반 등으로 정산이 보류된 경우에는 해당 회차 지급이 스킵되거나 지연될 수 있으며, 조건 충족 시 이후 회차에 반영됩니다.$old$,
    $new$아니요. 월 단위 자동 입금은 없습니다. Pulse(10 MOCO, $47.25) 이상이면 지갑에서 현재 등급의 기준 수량만 신청합니다. 세무 서류가 확인되고 수취 정보가 있어야 신청할 수 있으며, 회사는 확인 후 Payoneer, Wise 또는 은행으로 수동 송금합니다.$new$
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'LIVE'
  AND "bodyText" LIKE $like$%매월 1일 정산 배치%$like$;

UPDATE "legal_document_revision"
SET
  "bodyText" = replace(
    "bodyText",
    $old$이월 안내: 등급 기준을 초과하고 남은 MOCO는 사라지지 않고 다음 달 정산으로 자동 이월됩니다. (예: 이번 달 2,203 MOCO 수령 시 → Dimension 등급(2,200 MOCO) 정산금 $10,659.00 지급 + 남은 3 MOCO는 다음 달로 이월)$old$,
    $new$남은 MOCO는 사라지지 않고 지갑 잔액에 남습니다. 다음 신청은 그때의 잔액으로 다시 달성한 등급의 기준 수량만 지급합니다. (예: 2,203 MOCO이면 Dimension(2,200 MOCO) 정산금 $10,659.00를 신청하고, 남은 3 MOCO는 지갑에 남습니다.)$new$
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'LIVE'
  AND "bodyText" LIKE $like$%다음 달 정산으로 자동 이월%$like$;
