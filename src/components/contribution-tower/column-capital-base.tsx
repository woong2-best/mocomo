/** Decorative SVG capital / base for the contribution column */

export function ColumnCapital() {
  return (
    <svg
      className="block h-auto w-full"
      viewBox="0 0 312 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 48h296v4H8v-4zm4-8h288v8H12v-8zm-8-4 12-20h272l12 20H4zm16-24 20-12h232l20 12H20z"
        fill="url(#capStone)"
      />
      <path
        d="M36 8c24-6 48-8 72-8s48 2 72 8l-8 12H44L36 8z"
        fill="#e8e2d8"
        opacity="0.9"
      />
      <ellipse cx="156" cy="14" rx="100" ry="8" fill="#d4cdc2" />
      {[48, 72, 96, 120, 144, 168, 192, 216, 240, 264].map((x) => (
        <path
          key={x}
          d={`M${x} 18c2 4 4 8 4 12s-2 8-4 12`}
          stroke="#9a9084"
          strokeWidth="1.2"
          fill="none"
          opacity="0.5"
        />
      ))}
      <defs>
        <linearGradient id="capStone" x1="156" y1="0" x2="156" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f2ede5" />
          <stop offset="0.5" stopColor="#ddd5c8" />
          <stop offset="1" stopColor="#b8aea0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ColumnBase() {
  return (
    <svg
      className="block h-auto w-full"
      viewBox="0 0 336 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M0 12h336v28H0V12zm16-8h304v8H16V4zm-8-4 16-8h288l16 8H8z" fill="url(#baseStone)" />
      <rect x="24" y="20" width="288" height="4" fill="#a89f92" opacity="0.4" />
      <defs>
        <linearGradient id="baseStone" x1="168" y1="0" x2="168" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b8a8" />
          <stop offset="0.45" stopColor="#ebe6dc" />
          <stop offset="1" stopColor="#9a9084" />
        </linearGradient>
      </defs>
    </svg>
  );
}
