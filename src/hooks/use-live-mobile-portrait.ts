"use client";

import { useEffect, useState } from "react";

/** 스마트폰·세로 화면 라이브 — 인스타그램 스타일 풀스크린 */
export function useLiveMobilePortrait() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px) and (orientation: portrait)");

    const update = () => {
      const portrait =
        query.matches ||
        (window.innerWidth < 1024 && window.innerHeight > window.innerWidth);
      setActive(portrait);
    };

    update();
    query.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return active;
}
