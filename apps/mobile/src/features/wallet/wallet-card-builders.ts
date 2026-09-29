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
  colors: ThemeColors
): WalletCardModel[] {
  const palette = [colors.cobalt, colors.terracotta, colors.forest, "#2a3550", "#4b5563"];
  const sorted = [...methods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const cards: WalletCardModel[] = sorted.map((pm, index) => ({
    id: pm.id,
    backgroundColor: palette[index % palette.length]!,
    eyebrow: pm.isDefault ? "기본 결제 수단" : pm.brand,
    title: "",
    amount: `•••• ${pm.last4}`,
    subtitle: `${String(pm.expMonth).padStart(2, "0")}/${String(pm.expYear).slice(-2)} · ${pm.brand}`,
    badge: pm.isDefault ? "DEFAULT" : undefined,
    expandedLines: pm.isDefault
      ? ["결제 시 이 카드가 먼저 선택됩니다.", "다른 카드를 탭해 기본으로 지정할 수 있습니다."]
      : ["탭하여 기본 결제 수단으로 지정", "길게 눌러 삭제 (추후)"],
  }));

  cards.push({
    id: "add",
    backgroundColor: "#1a1f2e",
    eyebrow: "결제 수단",
    title: "",
    amount: "",
    subtitle: "카드를 등록해 두면 결제할 때 선택할 수 있습니다",
    badge: "+",
    expandedLines: ["Apple Pay처럼 여러 카드를 저장", "탭하여 Stripe로 안전하게 등록"],
  });

  return cards;
}
