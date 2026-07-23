/** Scroll the app main pane (or window) to top — used by home logo refresh, toasts, etc. */
export function scrollMainToTop(behavior: ScrollBehavior = "smooth") {
  const main = document.getElementById("mocomo-main-scroll");
  if (main) {
    main.scrollTo({ top: 0, behavior });
    return;
  }
  window.scrollTo({ top: 0, behavior });
}
