import Link from "next/link";

export const metadata = {
  title: "APT Scene Review | MoCoMo",
  description: "Corner living room — Scene Polish #4 (Final Identity Candidate)",
};

const SCENE = "/apt/hero-assets/scene-material-assembly.html";

export default function AptSceneReviewPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 font-sans text-stone-800 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-900/70">Owner review</p>
        <h1 className="mt-1 text-xl font-bold text-stone-900">APT Corner Scene — Polish #4</h1>
        <p className="mt-2 text-sm text-stone-600">
          <strong>/apt</strong> 게임 화면과 다릅니다. 아래 버튼으로 3D 씬을 여세요.
        </p>
        <Link
          href="/apt/corner"
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-stone-900 px-4 py-3.5 text-sm font-bold text-white active:scale-[0.98]"
        >
          3D 씬 전체화면 열기
        </Link>
      </div>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Live scene</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link className="text-amber-800 underline underline-offset-2" href="/apt/corner?compare=0">
              Current scene (Polish #4)
            </Link>
          </li>
          <li>
            <Link className="text-amber-800 underline underline-offset-2" href="/apt/corner?compare=1">
              Reference vs current
            </Link>
          </li>
          <li>
            <Link className="text-amber-800 underline underline-offset-2" href="/apt/corner?compare=0&zone=sofa">
              Sofa marshmallow close-up
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Captures (Polish #4)</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {[
            ["01-current-scene.png", "Current scene"],
            ["02-sofa-marshmallow.png", "Sofa close-up"],
            ["03-before-after-polish.png", "Polish #3 → #4"],
          ].map(([file, label]) => (
            <li key={file}>
              <a
                className="block overflow-hidden rounded-lg border border-stone-200 bg-stone-50"
                href={`/apt/hero-assets/_scene-polish-4/${file}`}
                target="_blank"
                rel="noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/apt/hero-assets/_scene-polish-4/${file}`}
                  alt={label}
                  className="aspect-video w-full object-cover"
                />
                <span className="block px-3 py-2 text-xs text-stone-600">{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-lg border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-stone-700">
        <p className="font-medium">Final Gate</p>
        <p className="mt-1">
          Reference 없이 봤을 때 &quot;Bondee 같은 게임&quot;이라고 말할 가능성이 높은가?
        </p>
      </section>

      <p className="mt-6 text-center text-xs text-stone-400">
        Direct:{" "}
        <a className="underline" href={`${SCENE}?compare=0`}>
          assembly.html
        </a>
      </p>
    </main>
  );
}
