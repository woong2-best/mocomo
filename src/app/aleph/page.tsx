import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import { AlephTicketCopy } from "@/components/aleph/aleph-ticket-copy";
import { ALEPH_TITLE } from "@/lib/aleph-ticket";

const alephWordmark = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: ALEPH_TITLE,
  robots: { index: false, follow: false },
};

export default function AlephTicketPage() {
  return (
    <main
      className="fixed inset-0 z-[100] overflow-hidden bg-black bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: "url(/images/aleph-bg.jpg)" }}
    >
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-16 sm:px-6">
        <h1
          className={`${alephWordmark.className} flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-center font-normal uppercase sm:gap-x-7`}
          style={{ fontFamily: alephWordmark.style.fontFamily, fontWeight: 400 }}
        >
          <span className="text-[clamp(2.1rem,7vw,4.8rem)] tracking-[0.14em]">MoCoMo</span>
          <span className="text-[clamp(1.5rem,5vw,3.1rem)] tracking-[0.22em] text-white/80">X</span>
          <span className="text-[clamp(2.1rem,7vw,4.8rem)] tracking-[0.14em]">Aleph</span>
        </h1>
        <AlephTicketCopy />
      </div>
    </main>
  );
}
