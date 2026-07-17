import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Eye, ReceiptText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Link } from "wouter";

export default function SubscriptionOrders() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin", "ts", "orders"],
    queryFn: () => teacherSubscriptionAdminApi.listOrders(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => teacherSubscriptionAdminApi.approveOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ts", "orders"] });
      toast({ title: "تم قبول الطلب بنجاح" });
    },
    onError: () => toast({ title: "فشل في قبول الطلب", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      teacherSubscriptionAdminApi.rejectOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ts", "orders"] });
      toast({ title: "تم رفض الطلب" });
    },
    onError: () => toast({ title: "فشل في رفض الطلب", variant: "destructive" }),
  });

  // Proof is a private, Bearer-authenticated file — fetch as a blob and open an
  // object URL instead of linking to the raw (unauthenticated) path.
  const proofMutation = useMutation({
    mutationFn: (id: number) => teacherSubscriptionAdminApi.downloadOrderProof(id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
    onError: (error: any) =>
      toast({ title: "تعذر فتح إثبات الدفع", description: error?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">طلبات الاشتراكات</h1>
        <p className="text-muted-foreground mt-1">إدارة ومراجعة طلبات تفعيل الاشتراكات</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلبات</CardTitle>
          <CardDescription>عرض جميع طلبات الاشتراكات وحالاتها</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الخطة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">جاري التحميل...</TableCell>
                  </TableRow>
                ) : orders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">لا توجد طلبات</TableCell>
                  </TableRow>
                ) : (
                  orders?.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.payer_name}</div>
                        <div className="text-xs text-muted-foreground">{order.phone}</div>
                      </TableCell>
                      <TableCell>{order.plan_id}</TableCell>
                      <TableCell>{order.amount_jod} د.أ</TableCell>
                      <TableCell>{order.payment_method}</TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === "approved" ? "default" : 
                          order.status === "pending" ? "outline" : "destructive"
                        }>
                          {order.status === "approved" ? "مقبول" : 
                           order.status === "pending" ? "انتظار" : "مرفوض"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), "PPP", { locale: ar })}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild title="تفاصيل الطلب">
                            <Link href={`/admin/teacher-subscriptions/orders/${order.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {order.payment_proof_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="فتح إثبات الدفع"
                              onClick={() => proofMutation.mutate(order.id)}
                              disabled={proofMutation.isPending}
                            >
                              <ReceiptText className="h-4 w-4" />
                            </Button>
                          )}
                          {order.status === "pending" && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-emerald-600"
                                onClick={() => approveMutation.mutate(order.id)}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive"
                                onClick={() => rejectMutation.mutate({ id: order.id, reason: "تم الرفض من الإدارة" })}
                                disabled={rejectMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
