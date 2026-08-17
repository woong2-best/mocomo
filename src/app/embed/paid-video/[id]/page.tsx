import { Suspense } from "react";
import EmbedPaidVideoClient from "./embed-paid-video-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EmbedPaidVideoPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-black text-white/70">
          Loading…
        </div>
      }
    >
      <EmbedPaidVideoClient params={props.params} />
    </Suspense>
  );
}
