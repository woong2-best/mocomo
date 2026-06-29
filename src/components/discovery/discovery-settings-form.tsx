"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DiscoveryGender, DiscoveryLookingFor } from "@prisma/client";
import { updateDiscoverySettings } from "@/actions/discovery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DISCOVERY_GENDER_LABELS,
  DISCOVERY_LOOKING_LABELS,
  DISCOVERY_LOOKING_UI_OPTIONS,
  DISCOVERY_MIN_AGE,
  DISCOVERY_MAX_DISTANCE_KM,
  normalizeLookingFor,
} from "@/lib/discovery/constants";
import type { DiscoverySettings } from "@/lib/discovery/types";
import { cn } from "@/lib/utils";
import { getCurrentCoords, geolocationErrorMessage } from "@/lib/client-geolocation";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { MapPin, Shield, Sparkles } from "lucide-react";

const GENDERS = Object.keys(DISCOVERY_GENDER_LABELS) as DiscoveryGender[];

export function DiscoverySettingsForm({ initial }: { initial: DiscoverySettings }) {
  const router = useRouter();
  const { isNativeApp } = useClientPlatform();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [gender, setGender] = useState(initial.gender);
  const [showGender, setShowGender] = useState(initial.showGender);
  const [showAge, setShowAge] = useState(initial.showAge);
  const [city, setCity] = useState(initial.city ?? "");
  const [maxDistanceKm, setMaxDistanceKm] = useState(
    Math.min(initial.maxDistanceKm, DISCOVERY_MAX_DISTANCE_KM)
  );
  const [minAge, setMinAge] = useState(initial.minAge);
  const [maxAge, setMaxAge] = useState(initial.maxAge);
  const [lookingFor, setLookingFor] = useState<DiscoveryLookingFor>(normalizeLookingFor(initial.lookingFor));
  const [preferred, setPreferred] = useState<DiscoveryGender[]>(initial.preferredGenders);
  const [pitch, setPitch] = useState(initial.pitch ?? "");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [lat, setLat] = useState<number | null>(initial.lat);
  const [lng, setLng] = useState<number | null>(initial.lng);

  function togglePreferred(g: DiscoveryGender) {
    setPreferred((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function geocodeCity() {
    if (!city.trim()) return;
    setGeoLoading(true);
    try {
      const res = await fetch(`/api/used/geocode?q=${encodeURIComponent(city.trim())}`);
      const data = await res.json();
      if (data.lat != null && data.lng != null) {
        setLat(data.lat);
        setLng(data.lng);
        setMsg("위치 좌표를 저장했습니다.");
      } else {
        setMsg("위치를 찾지 못했습니다. 도시명을 다시 입력해 주세요.");
      }
    } catch {
      setMsg("위치 검색에 실패했습니다.");
    } finally {
      setGeoLoading(false);
    }
  }

  async function fetchCurrentLocation() {
    setGeoLoading(true);
    setMsg("");
    try {
      const coords = await getCurrentCoords();
      setLat(coords.lat);
      setLng(coords.lng);
      try {
        const res = await fetch(
          `/api/used/reverse-geocode?lat=${encodeURIComponent(String(coords.lat))}&lng=${encodeURIComponent(String(coords.lng))}`
        );
        const data = (await res.json()) as { label?: string; error?: string };
        if (res.ok && data.label) {
          setCity(data.label);
          setMsg("현재 위치를 설정했습니다.");
        } else {
          setMsg("위치 좌표를 저장했습니다.");
        }
      } catch {
        setMsg("위치 좌표를 저장했습니다.");
      }
    } catch (err) {
      setMsg(geolocationErrorMessage(err));
    } finally {
      setGeoLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const result = await updateDiscoverySettings({
      enabled,
      gender,
      showGender,
      showAge,
      city,
      lat,
      lng,
      maxDistanceKm,
      minAge,
      maxAge,
      lookingFor,
      preferredGenders: preferred,
      pitch,
    });
    if (result && "error" in result && result.error) {
      setMsg(result.error);
    } else {
      setMsg("저장되었습니다.");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <AppPageChrome spacing="sm">
    <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
      <Link href="/discover" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
        ← 매칭
      </Link>

      <div className="space-y-1">
        <h1 className={cn("text-2xl font-display font-bold flex items-center gap-2", isNativeApp && "sr-only")}>
          <Sparkles className="h-6 w-6 text-violet-500" />
          매칭 설정
        </h1>
        <p className="text-sm text-muted-foreground">
          원할 때만 켜세요. 끄면 추천 풀에서 완전히 빠집니다.
        </p>
      </div>

      <Card className="rounded-2xl border-violet-500/20 bg-gradient-to-br from-violet-950/10 to-fuchsia-950/10">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>만 {DISCOVERY_MIN_AGE}세 이상 · 생년월일 등록 필수</p>
            <p>매칭 상대에게만 공개하는 정보는 아래에서 선택</p>
            {!initial.hasBirthDate && (
              <Link href="/settings/profile" className="text-primary underline font-medium">
                프로필에서 생년월일 등록 →
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">참여</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm font-medium">매칭 추천 받기</span>
            <input
              type="checkbox"
              checked={enabled}
              disabled={!initial.hasBirthDate}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-5 w-5 rounded accent-violet-600 disabled:opacity-40"
            />
          </label>
          {!initial.hasBirthDate && (
            <p className="text-xs text-muted-foreground mt-2">
              생년월일 등록 후 참여할 수 있어요.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">나를 소개</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">한 줄 소개 (매칭 전용)</label>
            <textarea
              className="mt-1 w-full min-h-[80px] rounded-xl border bg-background px-3 py-2 text-sm"
              maxLength={280}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="같이 코스프레 찍을 사람, 애니 얘기할 친구…"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">내 성별</label>
            <select
              className="mt-1 w-full border rounded-xl px-3 py-2 text-sm"
              value={gender}
              onChange={(e) => setGender(e.target.value as DiscoveryGender)}
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {DISCOVERY_GENDER_LABELS[g]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showGender} onChange={(e) => setShowGender(e.target.checked)} />
            성별 공개
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAge} onChange={(e) => setShowAge(e.target.checked)} />
            나이 공개
          </label>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">찾는 상대</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {DISCOVERY_LOOKING_UI_OPTIONS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLookingFor(l)}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-medium border transition-colors",
                  lookingFor === l
                    ? "bg-violet-600 text-white border-violet-500"
                    : "bg-muted/40 border-transparent"
                )}
              >
                {DISCOVERY_LOOKING_LABELS[l]}
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">선호 성별 (비우면 모두)</p>
            <div className="flex flex-wrap gap-2">
              {GENDERS.filter((g) => g !== "UNSPECIFIED").map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => togglePreferred(g)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs border",
                    preferred.includes(g) ? "bg-fuchsia-600/20 border-fuchsia-400" : "border-muted"
                  )}
                >
                  {DISCOVERY_GENDER_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">최소 나이</label>
              <Input
                type="number"
                min={DISCOVERY_MIN_AGE}
                max={99}
                value={minAge}
                onChange={(e) => setMinAge(Number(e.target.value))}
                className="mt-1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">최대 나이</label>
              <Input
                type="number"
                min={DISCOVERY_MIN_AGE}
                max={99}
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
                className="mt-1 rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-1">
            <MapPin className="h-4 w-4" /> 거리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="예: 서울 강남, 부산 해운대"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={geoLoading} onClick={() => void geocodeCity()}>
              도시 검색
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={geoLoading}
              onClick={() => void fetchCurrentLocation()}
            >
              {geoLoading ? "위치 확인 중…" : "현재 위치"}
            </Button>
          </div>
          {lat != null && lng != null && (
            <p className="text-[11px] text-emerald-600">위치 저장됨 · 거리 필터 적용</p>
          )}
          <div>
            <label className="text-xs text-muted-foreground">최대 거리 {maxDistanceKm}km</label>
            <input
              type="range"
              min={5}
              max={DISCOVERY_MAX_DISTANCE_KM}
              step={5}
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              className="w-full mt-2 accent-violet-600"
            />
          </div>
        </CardContent>
      </Card>

      {msg && (
        <p className={cn("text-sm text-center", msg.includes("실패") || msg.includes("못") ? "text-destructive" : "text-emerald-600")}>
          {msg}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold"
      >
        {loading ? "저장 중…" : "저장"}
      </Button>
    </form>
    </AppPageChrome>
  );
}
