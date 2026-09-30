"use client";

/** Mini retro CRT color bars — matches tab button height (~34px). */
export function LiveHubCrtMini() {
  return (
    <div className="live-hub-crt-mini shrink-0" aria-hidden>
      <div className="live-hub-crt-mini__bezel">
        <div className="live-hub-crt-mini__screen">
          <div className="live-hub-crt-mini__bars">
            <span className="live-hub-crt-mini__bar bar-1" />
            <span className="live-hub-crt-mini__bar bar-2" />
            <span className="live-hub-crt-mini__bar bar-3" />
            <span className="live-hub-crt-mini__bar bar-4" />
            <span className="live-hub-crt-mini__bar bar-5" />
            <span className="live-hub-crt-mini__bar bar-6" />
            <span className="live-hub-crt-mini__bar bar-7" />
          </div>
          <span className="live-hub-crt-mini__scanlines" />
          <span className="live-hub-crt-mini__vignette" />
        </div>
      </div>
    </div>
  );
}
