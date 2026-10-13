import { Noto_Serif_KR } from "next/font/google";

const notoSerifKr = Noto_Serif_KR({
  weight: ["500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export default function FortuneCookiesLayout({ children }: { children: React.ReactNode }) {
  return <div className={notoSerifKr.className}>{children}</div>;
}
