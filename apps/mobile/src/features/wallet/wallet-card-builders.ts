import type { UsedUiText } from "@/features/marketplace/used-catalog";
import type { ThemeColors } from "@/theme/tokens";
import type { WalletCardModel } from "@/features/wallet/wallet-card-layout";
export type PaymentMethodItem = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export function buildPaymentMethodCards(
  methods: PaymentMethodItem[],
  colors: ThemeColors,
  u: UsedUiText
): WalletCardModel[] {
  const palette = [colors.cobalt, colors.terracotta, colors.forest, "#2a3550", "#4b5563"];
  const sorted = [...methods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const cards: WalletCardModel[] = sorted.map((pm, index) => ({
    id: pm.id,
    backgroundColor: palette[index % palette.length]!,
    eyebrow: pm.isDefault ? u("기본 결제 수단", "Default card") : pm.brand,
    title: "",
    amount: `•••• ${pm.last4}`,
    subtitle: `${String(pm.expMonth).padStart(2, "0")}/${String(pm.expYear).slice(-2)} · ${pm.brand}`,
    badge: pm.isDefault ? "DEFAULT" : undefined,
    expandedLines: pm.isDefault
      ? [
          u("결제 시 이 카드가 먼저 선택됩니다.", "This card is selected first at checkout."),
          u("다른 카드를 탭해 기본으로 지정할 수 있습니다.", "Tap another card to set it as default."),
        ]
      : [
          u("탭하여 기본 결제 수단으로 지정", "Tap to set as default"),
          u("길게 눌러 삭제 (추후)", "Long press to remove (coming soon)"),
        ],
  }));

  cards.push({
    id: "add",
    backgroundColor: "#1a1f2e",
    eyebrow: u("결제 수단", "Payment methods"),
    title: "",
    amount: "",
    subtitle: u("카드를 등록해 두면 결제할 때 선택할 수 있습니다", "Save cards to choose at checkout."),
    badge: "+",
    expandedLines: [
      u("Apple Pay처럼 여러 카드를 저장", "Store multiple cards like Apple Pay"),
      u("탭하여 Stripe로 안전하게 등록", "Tap to add securely via Stripe"),
    ],
  });

  return cards;
}
