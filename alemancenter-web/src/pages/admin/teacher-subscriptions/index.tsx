import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Download,
  Cpu,
  Users,
  CreditCard,
  Smartphone,
  BarChart3,
  History,
  Loader2,
  ScrollText,
  ShoppingCart,
  Wrench,
} from "lucide-react";

export default function TeacherSubscriptions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["admin", "ts", "dashboard"],
    queryFn: () => teacherSubscriptionAdminApi.dashboard(),
  });

  const { data: finance } = useQuery({
    queryKey: ["admin", "ts", "report", "finance"],
    queryFn: () => teacherSubscriptionAdminApi.financeReport(),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin", "ts", "orders"],
    queryFn: () => teacherSubscriptionAdminApi.listOrders({ status: "pending" }),
  });

  // The dashboard endpoint nests counts under `stats`; revenue lives in the
  // finance report. The old code read flat keys that don't exist → always 0.
  const stats = (dashboard as any)?.stats ?? {};
  const fin = (finance as any) ?? {};

  // Manual expiry maintenance — marks lapsed subscriptions expired and sends
  // expiry notices. The backend runs it on a schedule; this triggers it now.
  const maintenanceMutation = useMutation({
    mutationFn: () => teacherSubscriptionAdminApi.runExpiryMaintenance(),
    onSuccess: (result) => {
      toast({
        title: "تمت الصيانة",
        description: `انتهى ${result.expired} اشتراك · ${result.notices} إشعار`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "ts"] });
    },
    onError: (error: Error) =>
      toast({ title: "فشلت الصيانة", description: error.message, variant: "destructive" }),
  });

  const menuItems = [
    { title: "الطلبات", icon: ShoppingCart, href: "/admin/teacher-subscriptions/orders", description: "مراجعة طلبات الاشتراك والدفع" },
    { title: "الاشتراكات", icon: CreditCard, href: "/admin/teacher-subscriptions/subscriptions", description: "إدارة اشتراكات المعلمين" },
    { title: "المعلمين", icon: Users, href: "/admin/teacher-subscriptions/teachers", description: "دليل المعلمين المشتركين" },
    { title: "الأجهزة", icon: Smartphone, href: "/admin/teacher-subscriptions/devices", description: "إدارة أجهزة المعلمين" },
    { title: "الملفات المميزة", icon: FileText, href: "/admin/teacher-subscriptions/premium-files", description: "إدارة الملفات الحصرية" },
    { title: "سجل التنزيلات", icon: Download, href: "/admin/teacher-subscriptions/downloads", description: "مراقبة تنزيلات المعلمين" },
    { title: "توليد AI", icon: Cpu, href: "/admin/teacher-subscriptions/ai-generations", description: "سجل استخدام أدوات AI" },
    { title: "التقارير المالية", icon: BarChart3, href: "/admin/teacher-subscriptions/reports", description: "تحليل الإيرادات والنمو" },
    { title: "إحصائيات الاستخدام", icon: History, href: "/admin/teacher-subscriptions/analytics", description: "تحليل نشاط المعلمين" },
    { title: "سجل التدقيق", icon: ScrollText, href: "/admin/teacher-subscriptions/audit-logs", description: "أثر الإجراءات الإدارية الحساسة" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">اشتراكات المعلمين</h1>
          <p className="mt-1 text-muted-foreground">إدارة خطط الاشتراكات والطلبات والملفات المميزة</p>
        </div>
        <Button
          variant="outline"
          onClick={() => maintenanceMutation.mutate()}
          disabled={maintenanceMutation.isPending}
        >
          {maintenanceMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Wrench className="ml-2 h-4 w-4" />}
          صيانة انتهاء الاشتراكات
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الاشتراكات النشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardLoading ? "-" : Number(stats.subscriptions_active ?? 0).toLocaleString("ar-EG")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات قيد الانتظار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {dashboardLoading ? "-" : Number(stats.orders_pending ?? orders?.length ?? 0).toLocaleString("ar-EG")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تنزيلات مميزة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardLoading ? "-" : Number(stats.premium_downloads ?? 0).toLocaleString("ar-EG")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عائدات الشهر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {Number(fin.current_month_revenue_jod ?? 0).toLocaleString("ar-EG")} د.أ
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>طلبات الدفع قيد الانتظار</CardTitle>
          <CardDescription>مراجعة سريعة لآخر الطلبات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                  </TableRow>
                ) : orders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد طلبات قيد الانتظار</TableCell>
                  </TableRow>
                ) : (
                  orders?.slice(0, 5).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>{order.payer_name || (order.user?.name || "مستخدم")}</TableCell>
                      <TableCell>{order.amount_jod} {order.currency}</TableCell>
                      <TableCell>{new Date(order.created_at).toLocaleDateString("ar-EG")}</TableCell>
                      <TableCell className="text-left">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/admin/teacher-subscriptions/orders">تفاصيل</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {orders && orders.length > 5 && (
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link href="/admin/teacher-subscriptions/orders">عرض جميع الطلبات ({orders.length})</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
