"use client";
import { createTranslator } from "@/lib/i18n/messages";
const i18n = createTranslator("en");



import { errorText } from "@/lib/i18n/error-text";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubcultureEventPinCard } from "@/components/events/subculture-event-pin-card";
import { EventsMapSpaceDecor } from "@/components/events/events-map-space-decor";
import { SubcultureEventsMapLazy } from "@/components/events/subculture-events-map-lazy";
import { getSubcultureGlobeInitialView } from "@/lib/subculture-event-countries";
import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";
import type { MapEventPin } from "@/lib/subculture-event-pins";
import {
  EVENT_MAP_PANEL_TABS,
  type EventMapPanelTab,
} from "@/lib/subculture-event-types";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

const MARS_DECOR_MAX_ZOOM = 2.2;

function filterListPinsByTab(pins: MapEventPin[], tab: EventMapPanelTab): MapEventPin[] {
  if (tab === "maid_cafe") {
    return pins.filter((p) => p.category === "maid_cafe");
  }
  if (tab === "recommendation") {
    return pins.filter((p) => p.category === "user_recommendation");
  }
  return pins.filter(
    (p) => p.category !== "maid_cafe" && p.category !== "user_recommendation"
  );
}

/** 행사장 탭에서도 메이드 카페 핀은 지도에 표시 */
function filterMapPinsByTab(pins: MapEventPin[], tab: EventMapPanelTab): MapEventPin[] {
  if (tab === "maid_cafe") {
    return pins.filter((p) => p.category === "maid_cafe");
  }
  if (tab === "recommendation") {
    return pins.filter((p) => p.category === "user_recommendation");
  }
  return pins.filter((p) => p.category !== "user_recommendation");
}

function formatCoordInput(n: number) {
  return n.toFixed(5);
}

function parseCoordInput(raw: string): number | null {
  const n = Number.parseFloat(raw.trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function EventsMapSidePanel({
  activeTab,
  onTabChange,
  pins,
  panelOpen,
  onTogglePanel,
  defaultPickCoords,
  pickedCoords,
  onPickedCoordsChange,
  onRecommendationCreated,
  showToggle = true,
}: {
  activeTab: EventMapPanelTab;
  onTabChange: (tab: EventMapPanelTab) => void;
  pins: MapEventPin[];
  panelOpen: boolean;
  onTogglePanel: () => void;
  defaultPickCoords: { lat: number; lng: number };
  pickedCoords: { lat: number; lng: number } | null;
  onPickedCoordsChange: (coords: { lat: number; lng: number } | null) => void;
  onRecommendationCreated: (pin: MapEventPin) => void;
  showToggle?: boolean;
}) {
  const { data: session } = useSession();
  const tabPins = useMemo(() => filterListPinsByTab(pins, activeTab), [pins, activeTab]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const resetRecommendationForm = useCallback(() => {
    setTitle("");
    setNote("");
    setFormError("");
    onPickedCoordsChange(null);
    setLatInput(formatCoordInput(defaultPickCoords.lat));
    setLngInput(formatCoordInput(defaultPickCoords.lng));
  }, [defaultPickCoords.lat, defaultPickCoords.lng, onPickedCoordsChange]);

  useEffect(() => {
    if (activeTab !== "recommendation") return;
    if (pickedCoords) {
      setLatInput(formatCoordInput(pickedCoords.lat));
      setLngInput(formatCoordInput(pickedCoords.lng));
      return;
    }
    if (!latInput && !lngInput) {
      setLatInput(formatCoordInput(defaultPickCoords.lat));
      setLngInput(formatCoordInput(defaultPickCoords.lng));
    }
  }, [
    activeTab,
    pickedCoords,
    defaultPickCoords.lat,
    defaultPickCoords.lng,
    latInput,
    lngInput,
  ]);

  const handleSubmitRecommendation = async () => {
    const lat = parseCoordInput(latInput);
    const lng = parseCoordInput(lngInput);
    if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setFormError("올바른 위도·경도를 입력하세요.");
      return;
    }
    if (!title.trim()) {
      setFormError(i18n("events.s1s1bl0n"));
      return;
    }
    if (!session?.user) {
      setFormError(i18n("events.s14jarhq"));
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/events/map/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: note.trim() || undefined,
          lat,
          lng,
        }),
      });
      const body = (await res.json()) as { pin?: MapEventPin; error?: string };
      if (!res.ok || !body.pin) {
        setFormError(errorText(body.error ?? i18n("events.sog10vg")));
        return;
      }
      onRecommendationCreated(body.pin);
      resetRecommendationForm();
    } catch {
      setFormError(i18n("events.sog10vg"));
    } finally {
      setSubmitting(false);
    }
  };

  const panelBody = (
    <div
      className={cn(
        "events-map-overlay notranslate pointer-events-auto flex flex-col min-h-0 rounded-2xl border border-white/15 bg-black/55 backdrop-blur-md shadow-2xl overflow-hidden",
        panelOpen ? (showToggle ? "w-72 xl:w-80" : "w-full") : "hidden"
      )}
      translate="no"
    >
      <div className="shrink-0 border-b border-white/10">
        <div className="flex items-center gap-1 px-2 pt-2 pb-1">
          {EVENT_MAP_PANEL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onTabChange(tab.id);
                if (tab.id !== "recommendation") {
                  onPickedCoordsChange(null);
                }
              }}
              className={cn(
                "notranslate flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                activeTab === tab.id
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white/85 hover:bg-white/5"
              )}
              translate="no"
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "recommendation" && (
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="text-[10px] text-emerald-300/90">{i18n("events.s1ftadli")}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 rounded-lg bg-emerald-600/90 text-white hover:bg-emerald-600 border-0 px-2.5"
              onClick={() => {
                resetRecommendationForm();
                onTabChange("venue");
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              취소
            </Button>
          </div>
        )}
      </div>

      {activeTab === "recommendation" && (
        <div className="shrink-0 border-b border-white/10 px-3 py-3 space-y-2 bg-emerald-950/40">
          <p className="text-[10px] text-emerald-200/80">지도를 탭하면 좌표가 채워집니다 · 직접 입력도 가능</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="위도 (lat)"
              inputMode="decimal"
              className="h-9 rounded-lg bg-black/30 border-white/15 text-white placeholder:text-white/40"
            />
            <Input
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              placeholder="경도 (lng)"
              inputMode="decimal"
              className="h-9 rounded-lg bg-black/30 border-white/15 text-white placeholder:text-white/40"
            />
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={i18n("events.snpdgax")}
            maxLength={80}
            className="h-9 rounded-lg bg-black/30 border-white/15 text-white placeholder:text-white/40"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={i18n("events.s11pg0k0")}
            maxLength={200}
            className="h-9 rounded-lg bg-black/30 border-white/15 text-white placeholder:text-white/40"
          />
          {formError && <p className="text-[11px] text-red-300">{formError}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500"
              disabled={submitting}
              onClick={() => void handleSubmitRecommendation()}
            >
              {submitting ? i18n("calendar.saving") : i18n("events.svsek")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              onClick={resetRecommendationForm}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-3 subculture-sidebar-scroll">
        {tabPins.length === 0 && activeTab !== "recommendation" ? (
          <Card className="rounded-xl bg-white/5 border-white/10 text-white">
            <CardContent className="p-6 text-center text-white/70 text-sm">
              {activeTab === "maid_cafe"
                ? i18n("events.szflaob")
                : i18n("events.s1psw04w")}
            </CardContent>
          </Card>
        ) : tabPins.length === 0 ? null : (
          tabPins.map((p) => (
            <SubcultureEventPinCard key={p.id} pin={p} variant="sidebar" />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="flex items-stretch min-h-0 h-full pointer-events-auto">
      {showToggle && panelOpen && (
        <button
          type="button"
          onClick={onTogglePanel}
          className="events-map-panel-toggle self-center shrink-0"
          aria-label={i18n("events.s1umwltj")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      {panelBody}
      {showToggle && !panelOpen && (
        <button
          type="button"
          onClick={onTogglePanel}
          className="events-map-panel-toggle events-map-panel-toggle--collapsed self-center shrink-0"
          aria-label={i18n("events.s5vp5cs")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function EventsMapView({
  initialPins,
  eventCountry: _eventCountry,
}: {
  initialPins: MapEventPin[];
  eventCountry: SubcultureEventCountry;
}) {
  const { countryCode } = useLocale();
  const [mapZoom, setMapZoom] = useState(1.55);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<EventMapPanelTab>("venue");
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [userRecommendations, setUserRecommendations] = useState<MapEventPin[]>([]);
  const marsVisible = mapZoom <= MARS_DECOR_MAX_ZOOM;

  const handleZoomChange = useCallback((zoom: number) => {
    setMapZoom(zoom);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/events/map/recommendations");
        const body = (await res.json()) as { pins?: MapEventPin[] };
        if (!cancelled && body.pins) {
          setUserRecommendations(body.pins);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const globeInitialView = useMemo(
    () => getSubcultureGlobeInitialView(countryCode),
    [countryCode]
  );

  const allPins = useMemo(
    () => [...initialPins, ...userRecommendations],
    [initialPins, userRecommendations]
  );

  const visibleMapPins = useMemo(
    () => filterMapPinsByTab(allPins, activeTab),
    [allPins, activeTab]
  );

  const defaultPickCoords = useMemo(
    () => ({ lat: globeInitialView.lat, lng: globeInitialView.lng }),
    [globeInitialView.lat, globeInitialView.lng]
  );

  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (activeTab !== "recommendation") return;
      setPickedCoords(coords);
    },
    [activeTab]
  );

  const handleRecommendationCreated = useCallback((pin: MapEventPin) => {
    setUserRecommendations((prev) => [pin, ...prev]);
  }, []);

  return (
    <div className="events-map-immersive relative h-full w-full min-h-0 bg-[#020208]">
      <EventsMapSpaceDecor />

      <div className="absolute inset-0 z-[1] isolate">
        <SubcultureEventsMapLazy
          pins={visibleMapPins}
          immersive
          interactive
          showNavigationControls={false}
          defaultView={globeInitialView}
          respectDefaultView
          onZoomChange={handleZoomChange}
          onMapClick={activeTab === "recommendation" ? handleMapClick : undefined}
          pinDropMode={activeTab === "recommendation"}
        />
      </div>

      {marsVisible ? (
        <div
          className="events-map-mars-hud absolute bottom-24 left-6 sm:bottom-28 sm:left-8 z-[15] pointer-events-none"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/events/mars-decor.png"
            alt=""
            className="events-map-mars-img"
            width={96}
            height={96}
            decoding="async"
            draggable={false}
          />
        </div>
      ) : null}

      <div className="hidden lg:flex absolute top-4 right-4 bottom-4 z-20 pointer-events-none">
        <EventsMapSidePanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pins={allPins}
          panelOpen={panelOpen}
          onTogglePanel={() => setPanelOpen((v) => !v)}
          defaultPickCoords={defaultPickCoords}
          pickedCoords={pickedCoords}
          onPickedCoordsChange={setPickedCoords}
          onRecommendationCreated={handleRecommendationCreated}
        />
      </div>

      <div className="lg:hidden absolute inset-x-0 bottom-0 z-20 p-3 pb-safe pointer-events-none max-h-[min(48vh,360px)]">
        <EventsMapSidePanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pins={allPins}
          panelOpen
          onTogglePanel={() => {}}
          defaultPickCoords={defaultPickCoords}
          pickedCoords={pickedCoords}
          onPickedCoordsChange={setPickedCoords}
          onRecommendationCreated={handleRecommendationCreated}
          showToggle={false}
        />
      </div>
    </div>
  );
}
