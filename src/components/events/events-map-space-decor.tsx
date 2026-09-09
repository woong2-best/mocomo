/** Events map — fixed starfield backdrop behind the map (never moves with zoom). */

export function EventsMapSpaceDecor() {
  return (
    <div
      className="events-map-space-backdrop absolute inset-0 z-0 pointer-events-none"
      aria-hidden
    >
      <div className="events-map-space-stars absolute inset-0" />
    </div>
  );
}
