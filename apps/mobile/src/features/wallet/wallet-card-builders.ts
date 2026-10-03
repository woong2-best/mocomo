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
  t: UsedUiText
): WalletCardModel[] {
  const palette = [colors.cobalt, colors.terracotta, colors.forest, "#2a3550", "#4b5563"];
  const sorted = [...methods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const cards: WalletCardModel[] = sorted.map((pm, index) => ({
    id: pm.id,
    backgroundColor: palette[index % palette.length]!,
    eyebrow: pm.isDefault ? t("m.wallet.default_card") : pm.brand,
    title: "",
    amount: `•••• ${pm.last4}`,
    subtitle: `${String(pm.expMonth).padStart(2, "0")}/${String(pm.expYear).slice(-2)} · ${pm.brand}`,
    badge: pm.isDefault ? "DEFAULT" : undefined,
    expandedLines: pm.isDefault
      ? [
          t("m.wallet.this_card_is_selected_first_at"),
          t("m.wallet.tap_another_card_to_set_it"),
        ]
      : [
          t("m.wallet.tap_to_set_as_default"),
          t("m.wallet.long_press_to_remove_coming_soon"),
        ],
  }));

  cards.push({
    id: "add",
    backgroundColor: "#1a1f2e",
    eyebrow: t("m.wallet.payment_methods"),
    title: "",
    amount: "",
    subtitle: t("m.wallet.save_cards_to_choose_at_checkout"),
    badge: "+",
    expandedLines: [
      t("m.wallet.store_multiple_cards_like_apple_pay"),
      t("m.wallet.tap_to_add_securely_via_stripe"),
    ],
  });

  return cards;
}
