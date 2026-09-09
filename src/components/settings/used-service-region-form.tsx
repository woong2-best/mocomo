"use client";

import { useState } from "react";
import { updateUsedServiceRegion } from "@/actions/used-market";
import { UsedRegionSelect } from "@/components/used/used-region-select";
import { Button } from "@/components/ui/button";
import { defaultUsedRegionForCountry } from "@/lib/used-regions-global";

export function UsedServiceRegionForm({
  countryCode,
  initialRegion,
}: {
  countryCode: string;
  initialRegion: string | null;
}) {
  const [region, setRegion] = useState(
    initialRegion?.trim() || defaultUsedRegionForCountry(countryCode)
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setLoading(true);
    setSaved(false);
    setError("");
    const res = await updateUsedServiceRegion(region);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        중고거래는 본인 국가·동네 이웃과만 가능합니다. 서비스 지역을 바꾸면 홈 피드와 검색 결과가 해당
        동네 기준으로 제한됩니다.
      </p>
      <UsedRegionSelect value={region} onChange={setRegion} countryCode={countryCode} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={loading} className="rounded-xl">
          {loading ? "저장 중…" : "서비스 지역 저장"}
        </Button>
        {saved ? <span className="text-sm text-muted-foreground">저장됨</span> : null}
      </div>
    </div>
  );
}
