import {
  AlertTriangle,
  CreditCard,
  Drama,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { ChartPlaceholder } from "@/components/admin/shell/chart-placeholder";
import { DashboardCard, StatCard } from "@/components/admin/shell/stat-card";
import { Button } from "@/components/ui/button";

/** 대시보드 더미 데이터 — 실연동은 이후 단계 */
const DUMMY_STATS = [
  { label: "총 회원수", value: "152,342", hint: "누적 가입", icon: Users },
  { label: "오늘 가입자", value: "132", hint: "UTC+9 기준", icon: UserPlus },
  { label: "총 크리에이터", value: "4,218", hint: "활성 크리에이터", icon: Drama },
  { label: "오늘 매출", value: "₩12,840,000", hint: "더미", icon: TrendingUp },
  { label: "이번달 정산 예정", value: "₩86,200,000", hint: "더미", icon: CreditCard },
  { label: "신고 대기", value: "8건", hint: "처리 대기", icon: AlertTriangle },
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            MoCoMo 운영 현황 요약입니다. 아래 수치는 현재 더미 데이터입니다.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled>
          새로고침 (준비 중)
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DUMMY_STATS.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPlaceholder
          title="최근 7일 가입자"
          bars={[98, 112, 86, 140, 125, 132, 118]}
        />
        <ChartPlaceholder
          title="최근 7일 매출"
          bars={[55, 62, 48, 78, 70, 88, 74]}
        />
      </div>

      <DashboardCard
        title="빠른 작업"
        description="버튼만 배치 · 실제 동작은 이후 단계에서 연결합니다."
      >
        <div className="flex flex-wrap gap-2">
          {[
            "쿠폰 생성",
            "회원 삭제",
            "정산 승인",
            "신고 처리",
            "상품 삭제",
            "라이브 종료",
            "통계 조회",
          ].map((label) => (
            <Button key={label} type="button" variant="outline" size="sm" disabled>
              {label}
            </Button>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
