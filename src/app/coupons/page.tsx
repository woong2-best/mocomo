import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMyCouponsAction } from "@/actions/admin-coupons";
import { getMyPromotionsAction } from "@/actions/admin-promotions";
import { SettingsPageChrome } from "@/components/settings/settings-page-chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CouponRedeemForm } from "@/components/coupon/coupon-redeem-form";

export const dynamic = "force-dynamic";

export default async function MyCouponsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/coupons");

  const [coupons, promotions] = await Promise.all([
    getMyCouponsAction(),
    getMyPromotionsAction(),
  ]);

  return (
    <SettingsPageChrome>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">My coupons · Promotions</h1>
        <Link href="/settings" className="text-sm text-muted-foreground hover:underline">
          Settings
        </Link>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Redeem coupons with a code; promotions attach to your account automatically. Both apply at checkout.
      </p>

      <CouponRedeemForm />

      <h2 className="text-lg font-semibold pt-2">Promotions</h2>
      {promotions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            You have no active promotions.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {promotions.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  <span>{a.promotion.name}</span>
                  <span className="text-xs font-normal rounded-full border px-2 py-0.5">
                    P{a.promotion.priority}
                  </span>
                  <span className="text-xs font-normal rounded-full border px-2 py-0.5">
                    {a.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{a.benefitLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Remaining benefit:{" "}
                  {a.remainingBenefitKrw != null
                    ? `₩${a.remainingBenefitKrw.toLocaleString()}`
                    : "Discount type"}
                  {" · "}
                  Expires:{" "}
                  {a.promotion.endsAt
                    ? a.promotion.endsAt.toISOString().slice(0, 10)
                    : "None"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold pt-4">Coupons</h2>
      {coupons.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            You have no coupons.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {coupons.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  <span>{a.coupon.name}</span>
                  <span className="text-xs font-normal text-muted-foreground font-mono">
                    {a.coupon.code}
                  </span>
                  <span className="text-xs font-normal rounded-full border px-2 py-0.5">
                    {a.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{a.benefitLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Remaining benefit:{" "}
                  {a.remainingBenefitKrw != null
                    ? `₩${a.remainingBenefitKrw.toLocaleString()}`
                    : "Discount type"}
                  {" · "}
                  Expires:{" "}
                  {a.coupon.endsAt
                    ? a.coupon.endsAt.toISOString().slice(0, 10)
                    : "None"}
                </p>
                {a.usages.length > 0 ? (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs font-medium mb-1">Usage history</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {a.usages.map((u) => (
                        <li key={u.id}>
                          {u.createdAt.toISOString().slice(0, 16).replace("T", " ")} · gross ₩
                          {u.grossAmountKrw.toLocaleString()} · benefit ₩
                          {u.benefitAppliedKrw.toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </SettingsPageChrome>
  );
}
