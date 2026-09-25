/**
 * Disk snapshot for Wallet / ATM so the screen paints immediately
 * (same pattern as feed + DM inbox bootstrap).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GemsWalletResponse } from "@/api/gems";
import type { PaymentMethodItem } from "@/features/wallet/wallet-card-builders";

const KEY = "mocomo.mobile-wallet-hub.v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type WalletSnapshot = {
  availableBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingPayout: number;
  bank: {
    bankName: string;
    accountMasked: string | null;
    holderName: string | null;
  } | null;
  recent: {
    id: string;
    type: string;
    amount: number;
    memo: string | null;
    createdAt: string;
  }[];
};

export type WalletHubSnapshot = {
  wallet?: WalletSnapshot;
  paymentMethods?: { methods: PaymentMethodItem[] };
  gems?: GemsWalletResponse;
};

type Stored = { savedAt: number } & WalletHubSnapshot;

export async function loadWalletBootstrap(): Promise<WalletHubSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return {
      wallet: parsed.wallet,
      paymentMethods: parsed.paymentMethods,
      gems: parsed.gems,
    };
  } catch {
    return null;
  }
}

export async function saveWalletBootstrap(partial: WalletHubSnapshot): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    let prev: Stored | null = null;
    if (raw) {
      try {
        prev = JSON.parse(raw) as Stored;
      } catch {
        prev = null;
      }
    }
    const payload: Stored = {
      savedAt: Date.now(),
      wallet: partial.wallet ?? prev?.wallet,
      paymentMethods: partial.paymentMethods ?? prev?.paymentMethods,
      gems: partial.gems ?? prev?.gems,
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Disk full / private mode — ignore
  }
}

export async function clearWalletBootstrap(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
