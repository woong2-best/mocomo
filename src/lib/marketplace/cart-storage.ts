export type MarketplaceCartItem = {
  listingId: string;
  title: string;
  priceAmount: number;
  currency: string;
  coverUrl: string | null;
  quantity: number;
  addedAt: number;
};

const STORAGE_KEY = "mocomo-marketplace-cart";

function readCart(): MarketplaceCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MarketplaceCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: MarketplaceCartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("marketplace-cart-updated"));
}

export function getMarketplaceCart(): MarketplaceCartItem[] {
  return readCart();
}

export function getMarketplaceCartCount(): number {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function addToMarketplaceCart(
  item: Omit<MarketplaceCartItem, "quantity" | "addedAt">,
  quantity = 1
) {
  const cart = readCart();
  const existing = cart.find((c) => c.listingId === item.listingId);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + quantity);
  } else {
    cart.unshift({
      ...item,
      quantity: Math.max(1, quantity),
      addedAt: Date.now(),
    });
  }
  writeCart(cart.slice(0, 50));
}

export function removeFromMarketplaceCart(listingId: string) {
  writeCart(readCart().filter((c) => c.listingId !== listingId));
}

export function updateMarketplaceCartQuantity(listingId: string, quantity: number) {
  const cart = readCart();
  const next = cart
    .map((c) =>
      c.listingId === listingId ? { ...c, quantity: Math.max(1, Math.min(99, quantity)) } : c
    )
    .filter((c) => c.quantity > 0);
  writeCart(next);
}

export function clearMarketplaceCart() {
  writeCart([]);
}
