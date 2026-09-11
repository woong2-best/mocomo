/**
 * 일회성: 마스터 DB 기준으로 SubcultureEventPin 좌표 보정 + pending geocode + 캐시 무효화
 *
 * Usage: npm run subculture:migrate-venues
 */
import { remediateSubcultureEventCoords } from "../src/lib/subculture-events";

async function main() {
  console.log("[migrate-subculture-venue-coords] starting…");
  console.log(
    "[note] No Redis geocode cache — coords live in SubcultureEventPin; Next.js map pin cache uses tag subculture-event-pins"
  );

  const result = await remediateSubcultureEventCoords({ geocodeMax: 200 });

  console.log(
    JSON.stringify(
      {
        ok: true,
        reconciled: result.reconciled,
        geocoded: result.geocoded,
        purged: result.purged,
        samples: result.reconcileSamples,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("[migrate-subculture-venue-coords] failed", err);
  process.exit(1);
});
