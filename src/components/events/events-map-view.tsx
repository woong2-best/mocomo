"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Plus, X } from "lucide-react";
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

function MapOverlayChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/15 bg-black/45 backdrop-blur-md shadow-lg text-white",
        className
      )}
    >
      {children}
    </div>
  );
}

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

function EventsMapSidePanel({
  activeTab,
  onTabChange,
  pins,
  panelOpen,
  onTogglePanel,
  addMode,
  onAddModeChange,
  pendingCoords,
  onPendingCoordsClear,
  onRecommendationCreated,
  showToggle = true,
}: {
  activeTab: EventMapPanelTab;
  onTabChange: (tab: EventMapPanelTab) => void;
  pins: MapEventPin[];
  panelOpen: boolean;
  onTogglePanel: () => void;
  addMode: boolean;
  onAddModeChange: (next: boolean) => void;
  pendingCoords: { lat: number; lng: number } | null;
  onPendingCoordsClear: () => void;
  onRecommendationCreated: (pin: MapEventPin) => void;
  showToggle?: boolean;
}) {
  const { data: session } = useSession();
  const tabPins = useMemo(() => filterListPinsByTab(pins, activeTab), [pins, activeTab]);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!pendingCoords) {
      setTitle("");
      setNote("");
      setFormError("");
    }
  }, [pendingCoords]);

  const handleSubmitRecommendation = async () => {
    if (!pendingCoords || !title.trim()) {
      setFormError("장소 이름을 입력해 주세요.");
      return;
    }
    if (!session?.user) {
      setFormError("로그인 후 추천 장소를 등록할 수 있습니다.");
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
          lat: pendingCoords.lat,
          lng: pendingCoords.lng,
        }),
      });
      const body = (await res.json()) as { pin?: MapEventPin; error?: string };
      if (!res.ok || !body.pin) {
        setFormError(body.error ?? "저장에 실패했습니다.");
        return;
      }
      onRecommendationCreated(body.pin);
      onPendingCoordsClear();
      onAddModeChange(false);
      setTitle("");
      setNote("");
    } catch {
      setFormError("저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const panelBody = (
    <div
      className={cn(
        "events-map-overlay pointer-events-auto flex flex-col min-h-0 rounded-2xl border border-white/15 bg-black/55 backdrop-blur-md shadow-2xl overflow-hidden",
        panelOpen ? (showToggle ? "w-72 xl:w-80" : "w-full") : "hidden"
      )}
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
                  onAddModeChange(false);
                  onPendingCoordsClear();
                }
              }}
              className={cn(
                "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                activeTab === tab.id
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white/85 hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "recommendation" && (
          <div className="flex items-center justify-between px-3 pb-2">
            <p className="text-[10px] text-emerald-300/90">유저 추천 · 초록 핀</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 rounded-lg bg-emerald-600/90 text-white hover:bg-emerald-600 border-0 px-2.5"
              onClick={() => {
                if (addMode) {
                  onAddModeChange(false);
                  onPendingCoordsClear();
                  return;
                }
                if (!session?.user) {
                  setFormError("로그인 후 추천 장소를 등록할 수 있습니다.");
                  return;
                }
                onAddModeChange(true);
              }}
            >
              {addMode ? (
                <>
                  <X className="h-3.5 w-3.5 mr-1" />
                  취소
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  추가
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {pendingCoords && activeTab === "recommendation" && (
        <div className="shrink-0 border-b border-white/10 px-3 py-3 space-y-2 bg-emerald-950/40">
          <p className="text-[11px] text-emerald-200/90">
            선택 좌표 · {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
          </p>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="장소 이름"
            maxLength={80}
            className="h-9 rounded-lg bg-black/30 border-white/15 text-white placeholder:text-white/40"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="한 줄 메모 (선택)"
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
              {submitting ? "저장 중…" : "등록"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              onClick={onPendingCoordsClear}
            >
              취소
            </Button>
          </div>
        </div>
      )}

      {!pendingCoords && formError && activeTab === "recommendation" && (
        <p className="shrink-0 px-3 py-2 text-[11px] text-red-300 border-b border-white/10">
          {formError}
        </p>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-3 subculture-sidebar-scroll">
        {addMode && !pendingCoords && activeTab === "recommendation" && (
          <p className="text-xs text-emerald-200/80 text-center py-2">
            지도에서 원하는 위치를 클릭하세요
          </p>
        )}
        {tabPins.length === 0 ? (
          <Card className="rounded-xl bg-white/5 border-white/10 text-white">
            <CardContent className="p-6 text-center text-white/70 text-sm">
              {activeTab === "recommendation"
                ? "아직 추천 장소가 없습니다."
                : activeTab === "maid_cafe"
                  ? "등록된 메이드 카페가 없습니다."
                  : "등록된 행사가 없습니다."}
            </CardContent>
          </Card>
        ) : (
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
          aria-label="패널 접기"
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
          aria-label="패널 펼치기"
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
  const [addMode, setAddMode] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(
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

  const handleMapClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (!addMode || activeTab !== "recommendation") return;
      setPendingCoords(coords);
    },
    [addMode, activeTab]
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
          defaultView={globeInitialView}
          respectDefaultView
          onZoomChange={handleZoomChange}
          onMapClick={addMode ? handleMapClick : undefined}
          pinDropMode={addMode && activeTab === "recommendation"}
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

      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none">
        <MapOverlayChip className="pointer-events-auto px-3 py-2 sm:px-4 sm:py-2.5">
          <h1 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-violet-300 shrink-0" />
            <span>서브컬처·애니 행사 지도</span>
          </h1>
        </MapOverlayChip>
      </div>

      <div className="hidden lg:flex absolute top-4 right-4 bottom-4 z-20 pointer-events-none">
        <EventsMapSidePanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pins={allPins}
          panelOpen={panelOpen}
          onTogglePanel={() => setPanelOpen((v) => !v)}
          addMode={addMode}
          onAddModeChange={setAddMode}
          pendingCoords={pendingCoords}
          onPendingCoordsClear={() => setPendingCoords(null)}
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
          addMode={addMode}
          onAddModeChange={setAddMode}
          pendingCoords={pendingCoords}
          onPendingCoordsClear={() => setPendingCoords(null)}
          onRecommendationCreated={handleRecommendationCreated}
          showToggle={false}
        />
      </div>
    </div>
  );
}
