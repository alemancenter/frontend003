import { useQuery } from "@tanstack/react-query";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, DollarSign, Loader2, TrendingUp, Users } from "lucide-react";

// Backend AdminFinancialReport is a FLAT object (no `summary` wrapper, no time
// series). The old page read `report.summary.*` and `report.monthly_stats`,
// neither of which exist → every card showed 0 and the chart was empty.
interface FinanceReport {
  total_revenue_jod: number;
  current_month_revenue_jod: number;
  approved_orders: number;
  pending_orders: number;
  rejected_orders: number;
  active_subscriptions: number;
  expired_subscriptions: number;
}

export default function Reports() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ts", "report", "finance"],
    queryFn: () => teacherSubscriptionAdminApi.financeReport() as unknown as Promise<FinanceReport>,
  });

  const r = data;

  const tiles = [
    { label: "إجمالي الإيرادات", value: `${Number(r?.total_revenue_jod ?? 0).toLocaleString("ar-EG")} د.أ`, icon: DollarSign, tint: "text-emerald-600" },
    { label: "إيرادات الشهر الحالي", value: `${Number(r?.current_month_revenue_jod ?? 0).toLocaleString("ar-EG")} د.أ`, icon: TrendingUp, tint: "text-emerald-600" },
    { label: "الاشتراكات النشطة", value: Number(r?.active_subscriptions ?? 0).toLocaleString("ar-EG"), icon: CreditCard, tint: "text-primary" },
    { label: "الاشتراكات المنتهية", value: Number(r?.expired_subscriptions ?? 0).toLocaleString("ar-EG"), icon: Users, tint: "text-muted-foreground" },
  ];

  // Order-status breakdown — real data, replaces the phantom time-series chart.
  const orderStatus = [
    { label: "مقبولة", value: r?.approved_orders ?? 0, tone: "bg-emerald-500" },
    { label: "قيد الانتظار", value: r?.pending_orders ?? 0, tone: "bg-amber-500" },
    { label: "مرفوضة", value: r?.rejected_orders ?? 0, tone: "bg-destructive" },
  ];
  const orderTotal = Math.max(1, orderStatus.reduce((sum, s) => sum + s.value, 0));

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">التقارير المالية</h1>
        <p className="mt-1 text-muted-foreground">تحليل الإيرادات والاشتراكات والطلبات</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {tiles.map((tile) => (
              <Card key={tile.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{tile.label}</CardTitle>
                  <tile.icon className={`h-4 w-4 ${tile.tint}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black">{tile.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>توزيع الطلبات</CardTitle>
              <CardDescription>حالة طلبات الاشتراك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderStatus.map((s) => (
                <div key={s.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{s.label}</span>
                    <span className="font-medium">{s.value.toLocaleString("ar-EG")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${s.tone}`} style={{ width: `${(s.value / orderTotal) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
