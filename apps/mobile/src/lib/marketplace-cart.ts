import AsyncStorage from "@react-native-async-storage/async-storage";

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

async function readCart(): Promise<MarketplaceCartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MarketplaceCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCart(items: MarketplaceCartItem[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getMarketplaceCart(): Promise<MarketplaceCartItem[]> {
  return readCart();
}

export async function getMarketplaceCartCount(): Promise<number> {
  const cart = await readCart();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export async function addToMarketplaceCart(
  item: Omit<MarketplaceCartItem, "quantity" | "addedAt">,
  quantity = 1
) {
  const cart = await readCart();
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
  await writeCart(cart.slice(0, 50));
}

export async function removeFromMarketplaceCart(listingId: string) {
  const cart = await readCart();
  await writeCart(cart.filter((c) => c.listingId !== listingId));
}

export async function updateMarketplaceCartQuantity(listingId: string, quantity: number) {
  const cart = await readCart();
  const next = cart
    .map((c) =>
      c.listingId === listingId ? { ...c, quantity: Math.max(1, Math.min(99, quantity)) } : c
    )
    .filter((c) => c.quantity > 0);
  await writeCart(next);
}
