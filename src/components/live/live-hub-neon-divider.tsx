"use client";

/** Pink neon LIVE rail — script label, arrow, line, heart (reference mock). */
export function LiveHubNeonDivider() {
  return (
    <div className="live-hub-neon-pink-rail shrink-0" role="presentation" aria-hidden>
      <svg viewBox="0 0 960 44" preserveAspectRatio="none" className="live-hub-neon-pink-rail__svg">
        <defs>
          <filter id="liveHubPinkNeon" x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <text
          x="2"
          y="31"
          className="live-hub-neon-pink-rail__live-text"
          filter="url(#liveHubPinkNeon)"
        >
          LIVE
        </text>
        <path
          className="live-hub-neon-pink-rail__stroke"
          filter="url(#liveHubPinkNeon)"
          d="M 78 22 H 90 M 84 17 L 78 22 L 84 27 M 90 22 H 828"
        />
        <path
          className="live-hub-neon-pink-rail__stroke"
          filter="url(#liveHubPinkNeon)"
          d="M 848 24 C 848 16 858 10 866 16 C 874 10 884 16 884 24 C 884 34 866 42 866 42 C 866 42 848 34 848 24 Z"
        />
      </svg>
    </div>
  );
}
