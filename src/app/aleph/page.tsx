import type { Metadata } from "next";
import Image from "next/image";
import { AlephTicketCopy } from "@/components/aleph/aleph-ticket-copy";
import { ALEPH_TITLE } from "@/lib/aleph-ticket";

export const metadata: Metadata = {
  title: ALEPH_TITLE,
  robots: { index: false, follow: false },
};

export default function AlephTicketPage() {
  return (
    <main className="fixed inset-0 z-[100] overflow-hidden bg-black text-white [font-family:var(--font-geist-sans),system-ui,sans-serif]">
      <Image
        src="/images/aleph-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <h1 className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2 text-center font-folk-display">
          <span className="text-6xl font-semibold tracking-tight sm:text-8xl md:text-9xl">MoCoMo</span>
          <span className="translate-y-[-0.15em] text-2xl font-light tracking-[0.4em] text-white/65 sm:text-3xl md:text-4xl">
            X
          </span>
          <span className="text-6xl font-semibold tracking-tight sm:text-8xl md:text-9xl">Aleph</span>
        </h1>
        <AlephTicketCopy />
      </div>
    </main>
  );
}
