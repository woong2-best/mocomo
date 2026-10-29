import type { Metadata } from "next";
import {
  ALEPH_TICKET_COMMAND,
  ALEPH_TICKET_HEADING,
  ALEPH_TITLE,
} from "@/lib/aleph-ticket";

export const metadata: Metadata = {
  title: ALEPH_TITLE,
  robots: { index: false, follow: false },
};

export default function AlephTicketPage() {
  return (
    <main className="fixed inset-0 z-[100] flex items-center justify-center bg-black px-6 text-white [font-family:var(--font-geist-sans),system-ui,sans-serif]">
      <div className="max-w-3xl text-center">
        <p className="text-3xl font-medium tracking-tight sm:text-4xl">{ALEPH_TITLE}</p>
        <p className="mt-6 text-lg text-white/80">{ALEPH_TICKET_HEADING}</p>
        <p className="mt-6 break-all font-mono text-sm text-white sm:text-base">
          {ALEPH_TICKET_COMMAND}
        </p>
      </div>
    </main>
  );
}
