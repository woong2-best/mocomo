"use client";

/** Pink neon LIVE rail — script label, arrow, line, one-stroke heart (reference). */
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
          d="M 78 22 H 90 M 84 17 L 78 22 L 84 27 M 90 22 H 818
             C 824 22 828 26 826 32 C 824 38 816 38 812 32 C 808 26 812 22 818 22
             C 824 22 830 28 832 34 C 834 40 826 42 820 36 C 814 30 816 24 822 20
             C 828 16 838 18 844 24 C 850 30 860 24 870 24 C 880 24 886 30 886 38
             C 886 46 870 52 860 44 C 850 36 844 28 848 22 C 852 16 864 14 874 20
             C 884 26 894 22 904 22 H 948"
        />
      </svg>
    </div>
  );
}
