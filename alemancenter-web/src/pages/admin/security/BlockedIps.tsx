import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { adminSecurityApi } from "@/lib/api/admin";
import { useCountry } from "@/contexts/CountryContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Shield, ShieldCheck, ShieldX, Plus, Trash2, Globe, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function BlockedIps() {
  const queryClient = useQueryClient();
  const country = useCountry();
  const [newIp, setNewIp] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: blockedIps, isLoading: blockedLoading } = useQuery({
    queryKey: ["admin", "security", "blocked-ips", country],
    queryFn: () => adminSecurityApi.blockedIps({ country }),
  });

  const { data: trustedIps, isLoading: trustedLoading } = useQuery({
    queryKey: ["admin", "security", "trusted-ips", country],
    queryFn: () => adminSecurityApi.trustedIps({ country }),
  });

  const blockMutation = useMutation({
    mutationFn: (input: { ip: string; reason?: string }) => adminSecurityApi.blockIp(input.ip, input.reason, { country }),
    onSuccess: () => {
      toast.success("تم حظر عنوان IP بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "security"] });
      setNewIp("");
      setBlockReason("");
      setIsDialogOpen(false);
    },
    onError: () => toast.error("فشل في حظر عنوان IP"),
  });

  const unblockMutation = useMutation({
    mutationFn: (ip: string) => adminSecurityApi.unblockIp(ip, { country }),
    onSuccess: () => {
      toast.success("تم إلغاء حظر عنوان IP بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin", "security"] });
    },
    onError: () => toast.error("فشل في إلغاء حظر عنوان IP"),
  });

  const trustMutation = useMutation({
    mutationFn: (ip: string) => adminSecurityApi.trustIp(ip, { country }),
    onSuccess: () => {
      toast.success("تمت إضافة عنوان IP إلى القائمة الموثوقة");
      queryClient.invalidateQueries({ queryKey: ["admin", "security"] });
      setNewIp("");
      setIsDialogOpen(false);
    },
    onError: () => toast.error("فشل في توثيق عنوان IP"),
  });

  const untrustMutation = useMutation({
    mutationFn: (ip: string) => adminSecurityApi.untrustIp(ip, { country }),
    onSuccess: () => {
      toast.success("تمت إزالة عنوان IP من القائمة الموثوقة");
      queryClient.invalidateQueries({ queryKey: ["admin", "security"] });
    },
    onError: () => toast.error("فشل في إزالة توثيق عنوان IP"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-right">إدارة عناوين IP</h1>
          <p className="text-muted-foreground mt-1 text-right">التحكم في الوصول بناءً على عناوين IP المحظورة والموثوقة</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminCountrySelect />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              إضافة عنوان IP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-right">إضافة عنوان IP جديد</DialogTitle>
              <DialogDescription className="text-right">
                أدخل عنوان IP واختر الإجراء المناسب (حظر أو توثيق)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ip" className="text-right block">عنوان IP</Label>
                <Input
                  id="ip"
                  placeholder="192.168.1.1"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-right block">السبب (اختياري للحظر)</Label>
                <Textarea
                  id="reason"
                  placeholder="سبب الحظر..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="text-right"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-start">
              <Button
                variant="destructive"
                onClick={() => blockMutation.mutate({ ip: newIp, reason: blockReason })}
                disabled={!newIp || blockMutation.isPending}
              >
                <ShieldX className="h-4 w-4 ml-2" />
                حظر عنوان IP
              </Button>
              <Button
                variant="outline"
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => trustMutation.mutate(newIp)}
                disabled={!newIp || trustMutation.isPending}
              >
                <ShieldCheck className="h-4 w-4 ml-2" />
                توثيق عنوان IP
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs dir="rtl" defaultValue="blocked" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="blocked">المحظورة</TabsTrigger>
          <TabsTrigger value="trusted">الموثوقة</TabsTrigger>
        </TabsList>

        <TabsContent value="blocked" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>عناوين IP المحظورة</CardTitle>
              <CardDescription>هذه العناوين لن تتمكن من الوصول إلى الموقع</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">عنوان IP</TableHead>
                      <TableHead className="text-right">السبب</TableHead>
                      <TableHead className="text-right">تاريخ الحظر</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : blockedIps?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          لا توجد عناوين IP محظورة حالياً
                        </TableCell>
                      </TableRow>
                    ) : (
                      blockedIps?.map((item: any) => (
                        <TableRow key={item.ip || item.ip_address}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ShieldX className="h-4 w-4 text-destructive" />
                              <code className="bg-muted px-1 rounded text-xs" dir="ltr">
                                {item.ip || item.ip_address}
                              </code>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {item.reason || <span className="text-muted-foreground italic text-xs">لا يوجد سبب</span>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString("ar-EG") : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => unblockMutation.mutate(item.ip || item.ip_address)}
                              disabled={unblockMutation.isPending}
                            >
                              إلغاء الحظر
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trusted" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>عناوين IP الموثوقة</CardTitle>
              <CardDescription>هذه العناوين مستثناة من بعض قيود الأمان</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">عنوان IP</TableHead>
                      <TableHead className="text-right">تاريخ الإضافة</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trustedLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : trustedIps?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                          لا توجد عناوين IP موثوقة حالياً
                        </TableCell>
                      </TableRow>
                    ) : (
                      trustedIps?.map((item: any) => (
                        <TableRow key={item.ip || item.ip_address}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-green-600" />
                              <code className="bg-muted px-1 rounded text-xs" dir="ltr">
                                {item.ip || item.ip_address}
                              </code>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString("ar-EG") : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => untrustMutation.mutate(item.ip || item.ip_address)}
                              disabled={untrustMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
