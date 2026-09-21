import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const sk = process.env.STRIPE_SECRET_KEY?.trim();
if (!sk) {
  console.error("STRIPE_SECRET_KEY missing in .env");
  process.exit(1);
}

const res = await fetch("https://api.stripe.com/v1/balance", {
  headers: { Authorization: `Bearer ${sk}` },
});
const body = await res.json();
if (!res.ok) {
  console.error("Stripe API error:", body.error?.message ?? res.status);
  process.exit(1);
}
const usdAvail = body.available?.find((e) => e.currency === "usd")?.amount ?? 0;
console.log(
  JSON.stringify(
    {
      ok: true,
      mode: sk.startsWith("sk_test_") ? "test" : sk.startsWith("sk_live_") ? "live" : "unknown",
      usdAvailableCents: usdAvail,
    },
    null,
    2
  )
);
