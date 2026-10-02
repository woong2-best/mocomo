"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DiscoveryGender, DiscoveryLookingFor, DiscoveryMatchingMode } from "@prisma/client";
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
  DISCOVERY_MATCHING_UI_OPTIONS,
  DISCOVERY_MATCHING_LABELS,
  DISCOVERY_MATCHING_DESCRIPTIONS,
  normalizeLookingFor,
} from "@/lib/discovery/constants";
import type { DiscoverySettings } from "@/lib/discovery/types";
import { cn } from "@/lib/utils";
import { getCurrentCoords, geolocationErrorMessage } from "@/lib/client-geolocation";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { MapPin, Shield, Search } from "lucide-react";

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
  const [matchingMode, setMatchingMode] = useState<DiscoveryMatchingMode>(initial.matchingMode);
  const [preferred, setPreferred] = useState<DiscoveryGender[]>(initial.preferredGenders);
  const [pitch, setPitch] = useState(initial.pitch ?? "");
  const [msg, setMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);
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
        setMsg(t("discovery.s1uq2c8w"));
      setMsgIsError(false);
      } else {
        setMsg(t("discovery.svt8dox"));
      setMsgIsError(true);
      }
    } catch {
      setMsg(t("discovery.svat83g"));
      setMsgIsError(true);
    } finally {
      setGeoLoading(false);
    }
  }

  async function fetchCurrentLocation() {
    setGeoLoading(true);
    setMsg("");
    setMsgIsError(false);
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
          setMsg(t("discovery.s1x335ok"));
      setMsgIsError(false);
        } else {
          setMsg(t("discovery.s1uq2c8w"));
      setMsgIsError(false);
        }
      } catch {
        setMsg(t("discovery.s1uq2c8w"));
      setMsgIsError(false);
      }
    } catch (err) {
      setMsg(geolocationErrorMessage(err));
      setMsgIsError(true);
    } finally {
      setGeoLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setMsgIsError(false);
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
      matchingMode,
      preferredGenders: preferred,
      pitch,
    });
    if (result && "error" in result && result.error) {
      setMsg(errorText(result.error));
      setMsgIsError(true);
    } else {
      setMsg(t("profile.s12la3bm"));
      setMsgIsError(false);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <AppPageChrome spacing="sm">
    <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
      <Link href="/discover" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
        {t("discovery.s49bm3d")}
      </Link>

      <div className="space-y-1">
        <h1 className={cn("text-2xl font-display font-bold flex items-center gap-2", isNativeApp && "sr-only")}>
          <Search className="h-6 w-6 text-folk-terracotta" />
          {t("settings.discoverSettings")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("discovery.s1e7xis3")}
        </p>
      </div>

      <Card className="rounded-2xl border-folk-terracotta/25 bg-folk-terracotta/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>만 {DISCOVERY_MIN_AGE}세 이상 · 생년월일 등록 필수</p>
            <p>{t("discovery.s1shuzrv")}</p>
            {!initial.hasBirthDate && (
              <Link href="/settings/profile" className="text-primary underline font-medium">
                {t("discovery.snqv5pj")}
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("discovery.sztmc")}</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm font-medium">{t("discovery.s1tkxmpi")}</span>
            <input
              type="checkbox"
              checked={enabled}
              disabled={!initial.hasBirthDate}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-5 w-5 rounded accent-[hsl(var(--folk-terracotta))] disabled:opacity-40"
            />
          </label>
          {!initial.hasBirthDate && (
            <p className="text-xs text-muted-foreground mt-2">
              {t("discovery.s1avemm9")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("discovery.s3l8l3g")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">{t("discovery.s1feq4ud")}</label>
            <textarea
              className="mt-1 w-full min-h-[80px] rounded-xl border bg-background px-3 py-2 text-sm"
              maxLength={280}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder={t("discovery.shxdhrw")}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("discovery.smbaun3")}</label>
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
            {t("discovery.s1wwb978")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAge} onChange={(e) => setShowAge(e.target.checked)} />
            {t("discovery.s5ckg3v")}
          </label>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("discovery.s1card64")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {DISCOVERY_MATCHING_UI_OPTIONS.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMatchingMode(mode)}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-medium border transition-colors text-left",
                  matchingMode === mode
                    ? "bg-folk-terracotta text-white border-folk-terracotta"
                    : "bg-muted/40 border-transparent"
                )}
              >
                {DISCOVERY_MATCHING_LABELS[mode]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {DISCOVERY_MATCHING_DESCRIPTIONS[matchingMode]}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("discovery.s13sjand")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {matchingMode === "RANDOM" ? (
            <p className="text-xs text-amber-600/90 bg-amber-500/10 rounded-xl px-3 py-2">
              {t("discovery.sbv4do2")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {DISCOVERY_LOOKING_UI_OPTIONS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLookingFor(l)}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-medium border transition-colors",
                  lookingFor === l
                    ? "bg-folk-terracotta text-white border-folk-terracotta"
                    : "bg-muted/40 border-transparent"
                )}
              >
                {DISCOVERY_LOOKING_LABELS[l]}
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t("discovery.s1z0p1qe")}</p>
            <div className="flex flex-wrap gap-2">
              {GENDERS.filter((g) => g !== "UNSPECIFIED").map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => togglePreferred(g)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs border",
                    preferred.includes(g) ? "bg-folk-terracotta/15 border-folk-terracotta/50" : "border-muted"
                  )}
                >
                  {DISCOVERY_GENDER_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{t("discovery.s1a1on64")}</label>
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
              <label className="text-xs text-muted-foreground">{t("discovery.s187ms0o")}</label>
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
            <MapPin className="h-4 w-4" /> {t("discovery.sucl8")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder={t("discovery.s3sqcjx")}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={geoLoading} onClick={() => void geocodeCity()}>
              {t("discovery.sh66imp")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={geoLoading}
              onClick={() => void fetchCurrentLocation()}
            >
              {geoLoading ? t("discovery.sxtvgpy") : t("discovery.s9mxq6k")}
            </Button>
          </div>
          {lat != null && lng != null && (
            <p className="text-[11px] text-emerald-600">{t("discovery.sc0gfnu")}</p>
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
              className="w-full mt-2 accent-[hsl(var(--folk-terracotta))]"
            />
          </div>
        </CardContent>
      </Card>

      {msg && (
        <p className={cn("text-sm text-center", msgIsError ? "text-destructive" : "text-emerald-600")}>
          {msg}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-folk-terracotta text-white hover:bg-folk-terracotta/90 font-bold"
      >
        {loading ? t("calendar.saving") : t("settings.save")}
      </Button>
    </form>
    </AppPageChrome>
  );
}
