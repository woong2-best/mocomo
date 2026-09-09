/** Events map — starfield backdrop (z-0) + Mars decor (z-2, hidden when zoomed in). */

export function EventsMapSpaceDecor({ marsVisible }: { marsVisible: boolean }) {
  return (
    <>
      <div
        className="events-map-space-backdrop absolute inset-0 z-0 pointer-events-none"
        aria-hidden
      >
        <div className="events-map-space-stars absolute inset-0" />
      </div>

      <div
        className={`events-map-mars-layer absolute inset-0 z-[2] pointer-events-none overflow-hidden transition-opacity duration-500 ${
          marsVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      >
        <div className="events-map-mars-wrap absolute right-[8%] top-[14%] sm:right-[10%] sm:top-[15%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/events/mars-decor.png"
            alt=""
            className="events-map-mars-img"
            width={168}
            height={168}
            decoding="async"
            draggable={false}
          />
        </div>
      </div>
    </>
  );
}
