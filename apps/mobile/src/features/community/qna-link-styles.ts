import type { TextStyle } from "react-native";

/** Matches web `QNA_DETAIL_LINK_CLASS` (green QnA detail links). */
export const QNA_DETAIL_LINK_COLOR = "#16a34a";

export const qnaDetailLinkTextStyle: TextStyle = {
  color: QNA_DETAIL_LINK_COLOR,
  textDecorationLine: "underline",
};

export function textHasAutoLink(text: string): boolean {
  return /(?:https?:\/\/|www\.)[^\s]+/i.test(text);
}
