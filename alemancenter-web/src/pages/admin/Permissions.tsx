import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminRolesApi } from "@/lib/api/admin";
import type { Permission } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { groupPermissions } from "./rbac-utils";
import { Edit, KeyRound, Layers, Loader2, Plus, Search, Shield, Trash2 } from "lucide-react";

export default function Permissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [name, setName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["admin", "permissions", "list"],
    queryFn: () => adminRolesApi.listPermissions(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin", "roles", "list"],
    queryFn: () => adminRolesApi.list(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? adminRolesApi.updatePermission(editing.id, name.trim())
        : adminRolesApi.createPermission(name.trim()),
    onSuccess: () => {
      toast({ title: editing ? "تم تحديث الصلاحية" : "تم إضافة الصلاحية" });
      setIsDialogOpen(false);
      setEditing(null);
      setName("");
      invalidate();
    },
    onError: (error: Error) =>
      toast({
        title: editing ? "فشل التحديث" : "فشل الإضافة",
        description: error.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (permission: Permission) => adminRolesApi.deletePermission(permission.id),
    onSuccess: () => {
      toast({ title: "تم حذف الصلاحية" });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل الحذف", description: error.message, variant: "destructive" }),
  });

  const openDialog = (permission: Permission | null = null) => {
    setEditing(permission);
    setName(permission?.name ?? "");
    setIsDialogOpen(true);
  };

  // How many roles reference each permission — shown per row and in the chart.
  const roleCountByPermission = useMemo(() => {
    const counts = new Map<number, number>();
    for (const role of roles) {
      for (const permission of role.permissions ?? []) {
        counts.set(permission.id, (counts.get(permission.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [roles]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return permissions;
    return permissions.filter((p) => p.name.toLowerCase().includes(term));
  }, [permissions, search]);

  const groupCount = useMemo(() => groupPermissions(permissions).length, [permissions]);

  // Top-referenced permissions for the distribution chart (avoid a 200-bar mess).
  const chartData = useMemo(
    () =>
      permissions
        .map((p) => ({ name: p.name, count: roleCountByPermission.get(p.id) ?? 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    [permissions, roleCountByPermission],
  );

  const canSubmit = name.trim().length >= 1;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الصلاحيات</h1>
          <p className="mt-1 text-muted-foreground">تعريف الصلاحيات وتوزيعها عبر أدوار النظام</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/roles">
              <Shield className="ml-2 h-4 w-4" />
              الأدوار
            </Link>
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="ml-2 h-4 w-4" />
            صلاحية جديدة
          </Button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: KeyRound, label: "إجمالي الصلاحيات", value: permissions.length, tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
          { icon: Layers, label: "التصنيفات", value: groupCount, tint: "bg-primary/10 text-primary" },
          { icon: Shield, label: "الأدوار", value: roles.length, tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
        ].map((tile) => (
          <Card key={tile.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tile.tint}`}>
                <tile.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black leading-none">{tile.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tile.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  قائمة الصلاحيات
                  <span className="ms-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>
                </CardTitle>
                <CardDescription>كل صلاحية تُمنح للأدوار ثم تُطبّق على المستخدمين.</CardDescription>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في الصلاحيات..."
                  className="pr-8"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">المعرف</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead className="w-[130px]">مستخدمة في</TableHead>
                    <TableHead className="w-[100px] text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                        {search ? "لا توجد صلاحيات مطابقة" : "لا توجد صلاحيات"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((permission) => {
                      const roleCount = roleCountByPermission.get(permission.id) ?? 0;
                      return (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium text-muted-foreground">{permission.id}</TableCell>
                          <TableCell dir="ltr" className="text-start font-medium">
                            {permission.name}
                          </TableCell>
                          <TableCell>
                            {roleCount > 0 ? (
                              <Badge variant="secondary">{roleCount} دور</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">غير مستخدمة</span>
                            )}
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" title="تعديل" onClick={() => openDialog(permission)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                title="حذف"
                                onClick={() => setDeleteTarget(permission)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>الأكثر استخدامًا</CardTitle>
            <CardDescription>أعلى ١٠ صلاحيات حسب عدد الأدوار التي تمتلكها</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
                لا توجد بيانات لعرضها
              </div>
            ) : (
              <div className="h-[360px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill="hsl(var(--primary))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>{editing ? "تعديل الصلاحية" : "صلاحية جديدة"}</DialogTitle>
            <DialogDescription>
              اسم الصلاحية يجب أن يطابق ما يتحقق منه النظام بدقة (مثل: manage users).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="perm-name">اسم الصلاحية</Label>
            <Input
              id="perm-name"
              dir="ltr"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="manage users"
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSubmit) saveMutation.mutate();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={() => saveMutation.mutate()} disabled={!canSubmit || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ
            </Button>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف الصلاحية</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleteTarget?.name}» من كل الأدوار التي تمتلكها. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف نهائيًا
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
