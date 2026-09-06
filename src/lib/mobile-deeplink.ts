/** Web path → mocomo:// deep link for native app */
export function mobileDeepLinkFromPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p.startsWith("/messages/")) {
    const roomId = p.slice("/messages/".length).split(/[?#]/)[0];
    if (roomId) return `mocomo://messages/${roomId}`;
  }
  if (p.includes("incomingCall=")) {
    const callId = new URLSearchParams(p.includes("?") ? p.slice(p.indexOf("?")) : `?${p}`).get(
      "incomingCall"
    );
    if (callId) return `mocomo://call/${callId}`;
  }
  if (p.startsWith("/voice/")) {
    const id = p.slice("/voice/".length).split(/[?#]/)[0];
    if (id) return `mocomo://live/${id}`;
  }
  if (p.startsWith("/post/")) {
    const id = p.slice("/post/".length).split(/[?#]/)[0];
    if (id) return `mocomo://post/${id}`;
  }
  if (p.startsWith("/notifications")) return "mocomo://activity";
  if (p === "/MarketSellItem" || p.startsWith("/MarketSellItem")) {
    return "mocomo://open?path=MarketSellItem";
  }
  if (p === "/SellerListings" || p.startsWith("/SellerListings")) {
    return "mocomo://open?path=SellerListings";
  }
  return `mocomo://open?path=${encodeURIComponent(p)}`;
}
