import { getHomeChromeCssText } from "@/lib/home-chrome";

/** Sets --home-sidebar-image / --home-hero-image when an admin has replaced the art. */
export async function HomeChromeStyle() {
  const css = await new Promise<string>((resolve) => {
    const timer = setTimeout(() => resolve(""), 800);
    getHomeChromeCssText()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve("");
      });
  });
  if (!css) return null;
  return <style>{css}</style>;
}
