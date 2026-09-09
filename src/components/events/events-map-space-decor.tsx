/** Events map — decorative Mars & Moon on the globe’s black space backdrop. */

export function EventsMapSpaceDecor() {
  return (
    <div
      className="events-map-space-decor absolute inset-0 z-[5] pointer-events-none overflow-hidden"
      aria-hidden
    >
      {/* Mars — lower-left void */}
      <svg
        viewBox="0 0 80 80"
        className="absolute left-[5%] bottom-[12%] w-16 h-16 sm:w-20 sm:h-20 opacity-90"
      >
        <defs>
          <radialGradient id="mars-glow" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#e8926a" />
            <stop offset="55%" stopColor="#c24e32" />
            <stop offset="100%" stopColor="#7a2a18" />
          </radialGradient>
        </defs>
        <circle cx="40" cy="40" r="36" fill="url(#mars-glow)" />
        <ellipse cx="28" cy="32" rx="8" ry="6" fill="#a84328" opacity="0.45" />
        <ellipse cx="52" cy="48" rx="10" ry="7" fill="#8f3520" opacity="0.35" />
        <ellipse cx="44" cy="22" rx="5" ry="4" fill="#d07050" opacity="0.3" />
        <circle cx="40" cy="40" r="36" fill="none" stroke="#ff9a6e" strokeOpacity="0.12" strokeWidth="2" />
      </svg>

      {/* Moon — upper-right void (below globe toggle) */}
      <svg
        viewBox="0 0 64 64"
        className="absolute right-[14%] top-[16%] w-12 h-12 sm:w-16 sm:h-16 opacity-80"
      >
        <defs>
          <radialGradient id="moon-glow" cx="38%" cy="32%" r="62%">
            <stop offset="0%" stopColor="#e8eaef" />
            <stop offset="50%" stopColor="#b8bcc8" />
            <stop offset="100%" stopColor="#6b7280" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="url(#moon-glow)" />
        <ellipse cx="24" cy="26" rx="6" ry="5" fill="#8b919e" opacity="0.45" />
        <ellipse cx="38" cy="36" rx="8" ry="6" fill="#7a808d" opacity="0.4" />
        <ellipse cx="30" cy="40" rx="4" ry="3" fill="#9ca3af" opacity="0.35" />
        <circle cx="20" cy="34" r="2.5" fill="#6b7280" opacity="0.35" />
        <circle cx="32" cy="32" r="28" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
