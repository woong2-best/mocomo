import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMyCouponsAction } from "@/actions/admin-coupons";
import { SettingsPageChrome } from "@/components/settings/settings-page-chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MyCouponsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/coupons");

  const coupons = await getMyCouponsAction();

  return (
    <SettingsPageChrome>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">내 쿠폰</h1>
        <Link href="/settings" className="text-sm text-muted-foreground hover:underline">
          설정으로
        </Link>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        운영진이 지급한 수수료 혜택 쿠폰입니다. 정산 시 자동 적용됩니다.
      </p>

      {coupons.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            보유 중인 쿠폰이 없습니다.
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
                  남은 혜택:{" "}
                  {a.remainingBenefitKrw != null
                    ? `₩${a.remainingBenefitKrw.toLocaleString()}`
                    : "할인형"}
                  {" · "}
                  만료:{" "}
                  {a.coupon.endsAt
                    ? a.coupon.endsAt.toISOString().slice(0, 10)
                    : "없음"}
                </p>
                {a.usages.length > 0 ? (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs font-medium mb-1">사용 내역</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {a.usages.map((u) => (
                        <li key={u.id}>
                          {u.createdAt.toISOString().slice(0, 16).replace("T", " ")} · 정산 ₩
                          {u.grossAmountKrw.toLocaleString()} · 혜택 ₩
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
