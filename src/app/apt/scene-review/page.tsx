import Link from "next/link";

export const metadata = {
  title: "APT Scene Review | MoCoMo",
  description: "Corner living room — Scene Polish #4 (Final Identity Candidate)",
};

const SCENE = "/apt/hero-assets/scene-material-assembly.html";

export default function AptSceneReviewPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 font-sans text-stone-800">
      <h1 className="text-2xl font-semibold tracking-tight">APT Corner Scene — Owner Review</h1>
      <p className="mt-2 text-sm text-stone-600">
        Scene Polish #4 (Identity). Lighting · Composition · Camera · Material · Story Layer locked.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Live scene</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link className="text-amber-800 underline underline-offset-2" href={`${SCENE}?compare=0`}>
              Current scene (Polish #4)
            </Link>
          </li>
          <li>
            <Link className="text-amber-800 underline underline-offset-2" href={`${SCENE}?compare=1`}>
              Reference vs current
            </Link>
          </li>
          <li>
            <Link className="text-amber-800 underline underline-offset-2" href={`${SCENE}?compare=0&zone=sofa`}>
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
    </main>
  );
}
