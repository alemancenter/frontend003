import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, LogOut, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function DevicesList() {
  const queryClient = useQueryClient();
  const { data: devices, isLoading } = useQuery({
    queryKey: ["admin", "ts", "devices"],
    queryFn: () => teacherSubscriptionAdminApi.listDevices(),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => teacherSubscriptionAdminApi.deactivateDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ts", "devices"] });
      toast({ title: "تم إلغاء تفعيل الجهاز" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">إدارة الأجهزة</h1>
        <p className="text-muted-foreground mt-1">عرض وإدارة الأجهزة المتصلة بحسابات المعلمين</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الأجهزة النشطة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المعلم</TableHead>
                  <TableHead>الجهاز</TableHead>
                  <TableHead>المتصفح</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>آخر نشاط</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">جاري التحميل...</TableCell>
                  </TableRow>
                ) : devices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">لا توجد أجهزة</TableCell>
                  </TableRow>
                ) : (
                  devices?.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        {device.user_id} {/* Ideally teacher name but let's stick to available fields */}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Smartphone className="ml-2 h-4 w-4 text-muted-foreground" />
                          {device.label || device.device_hash}
                        </div>
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <Badge variant={device.is_active ? "default" : "secondary"}>
                          {device.is_active ? (
                            <div className="flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> نشط
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> غير نشط
                            </div>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {device.last_seen_at ? new Date(device.last_seen_at).toLocaleDateString("ar-EG") : "-"}
                      </TableCell>
                      <TableCell className="text-left">
                        {device.is_active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deactivateMutation.mutate(device.id)}
                            disabled={deactivateMutation.isPending}
                            title="إلغاء تفعيل"
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
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
