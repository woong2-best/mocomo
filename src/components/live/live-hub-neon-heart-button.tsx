"use client";

/** Pink neon stroke heart — same footprint as Live / Studio actions. */
export function LiveHubNeonHeartButton() {
  return (
    <button type="button" className="live-hub-neon-heart-btn shrink-0" aria-label="Heart">
      <svg viewBox="0 0 32 28" className="live-hub-neon-heart-btn__svg" aria-hidden>
        <path
          className="live-hub-neon-heart-btn__path"
          d="M16 24.2 C9.2 18.4 5.5 14.6 5.5 10.4 C5.5 7.2 8 4.8 11 4.8 C13.1 4.8 14.8 6 16 7.6 C17.2 6 18.9 4.8 21 4.8 C24 4.8 26.5 7.2 26.5 10.4 C26.5 14.6 22.8 18.4 16 24.2 Z"
        />
      </svg>
    </button>
  );
}
