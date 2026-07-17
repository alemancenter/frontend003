import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { adminRolesApi } from "@/lib/api/admin";
import type { Permission, Role } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { KeyRound, Loader2, Plus, Search, Shield, Sliders, Edit, Trash2 } from "lucide-react";

interface RoleFormState {
  name: string;
  permissions: number[];
}

const EMPTY_FORM: RoleFormState = { name: "", permissions: [] };

export default function Roles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);
  const [permSearch, setPermSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["admin", "roles", "list"],
    queryFn: () => adminRolesApi.list(),
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ["admin", "permissions", "list"],
    queryFn: () => adminRolesApi.listPermissions(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "permissions"] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: RoleFormState) =>
      editingRole
        ? adminRolesApi.update(editingRole.id, { name: payload.name, permissions: payload.permissions })
        : adminRolesApi.create({ name: payload.name, permissions: payload.permissions }),
    onSuccess: () => {
      toast({ title: editingRole ? "تم تحديث الدور" : "تم إضافة الدور" });
      closeDialog();
      invalidate();
    },
    onError: (error: Error) =>
      toast({
        title: editingRole ? "فشل تحديث الدور" : "فشل إضافة الدور",
        description: error.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (role: Role) => adminRolesApi.delete(role.id),
    onSuccess: () => {
      toast({ title: "تم حذف الدور" });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل حذف الدور", description: error.message, variant: "destructive" }),
  });

  const openDialog = (role: Role | null = null) => {
    setEditingRole(role);
    setForm({
      name: role?.name ?? "",
      permissions: role?.permissions?.map((p) => p.id) ?? [],
    });
    setPermSearch("");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRole(null);
    setForm(EMPTY_FORM);
  };

  const submit = () => {
    if (form.name.trim().length < 1) {
      toast({ title: "الاسم مطلوب", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ name: form.name.trim(), permissions: form.permissions });
  };

  const togglePermission = (id: number) =>
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(id)
        ? prev.permissions.filter((value) => value !== id)
        : [...prev.permissions, id],
    }));

  const filteredRoles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter((role) => role.name.toLowerCase().includes(term));
  }, [roles, search]);

  // Group permissions by category prefix, honoring the in-dialog search.
  const permissionGroups = useMemo(() => {
    const term = permSearch.trim().toLowerCase();
    const visible = term
      ? permissions.filter((p) => p.name.toLowerCase().includes(term))
      : permissions;
    return groupPermissions(visible);
  }, [permissions, permSearch]);

  const totalPermissions = permissions.length;

  const setGroup = (groupPerms: Permission[], checked: boolean) =>
    setForm((prev) => {
      const ids = new Set(prev.permissions);
      for (const perm of groupPerms) {
        if (checked) ids.add(perm.id);
        else ids.delete(perm.id);
      }
      return { ...prev, permissions: [...ids] };
    });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الأدوار</h1>
          <p className="mt-1 text-muted-foreground">إدارة أدوار النظام والصلاحيات الممنوحة لكل دور</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/permissions">
              <Sliders className="ml-2 h-4 w-4" />
              إدارة الصلاحيات
            </Link>
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="ml-2 h-4 w-4" />
            دور جديد
          </Button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none">{roles.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">الأدوار</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none">{totalPermissions}</p>
              <p className="mt-1 text-sm text-muted-foreground">الصلاحيات المتاحة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                الأدوار
                <span className="ms-2 text-sm font-normal text-muted-foreground">({filteredRoles.length})</span>
              </CardTitle>
              <CardDescription>كل دور يجمع مجموعة من الصلاحيات لتُمنح للمستخدمين.</CardDescription>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم الدور..."
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
                  <TableHead className="w-[200px]">الاسم</TableHead>
                  <TableHead>الصلاحيات الممنوحة</TableHead>
                  <TableHead className="w-[110px] text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      {search ? "لا توجد أدوار مطابقة" : "لا توجد أدوار"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role) => {
                    const perms = role.permissions ?? [];
                    return (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium text-muted-foreground">{role.id}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2 font-medium">
                            <Shield className="h-4 w-4 text-primary" />
                            {role.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          {perms.length === 0 ? (
                            <span className="text-sm text-muted-foreground">لا توجد صلاحيات</span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge variant="outline" className="font-bold">
                                {perms.length} صلاحية
                              </Badge>
                              {perms.slice(0, 4).map((permission) => (
                                <Badge key={permission.id} variant="secondary" className="text-xs">
                                  {permission.name}
                                </Badge>
                              ))}
                              {perms.length > 4 && (
                                <span className="text-xs text-muted-foreground">+{perms.length - 4}</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="تعديل" onClick={() => openDialog(role)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              title="حذف"
                              onClick={() => setDeleteTarget(role)}
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

      {/* Create / edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle>{editingRole ? "تعديل الدور" : "دور جديد"}</DialogTitle>
            <DialogDescription>حدد اسم الدور والصلاحيات الممنوحة له.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الدور</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="مثال: مدير محتوى"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>الصلاحيات</Label>
                <span className="text-xs text-muted-foreground">
                  {form.permissions.length} من {totalPermissions} محددة
                </span>
              </div>
              <div className="relative">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في الصلاحيات..."
                  className="pr-8"
                  value={permSearch}
                  onChange={(event) => setPermSearch(event.target.value)}
                />
              </div>

              <ScrollArea className="h-[320px] rounded-md border p-3">
                {permissionsLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </div>
                ) : permissionGroups.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">لا توجد صلاحيات مطابقة</div>
                ) : (
                  <div className="space-y-4">
                    {permissionGroups.map((group) => {
                      const selectedInGroup = group.permissions.filter((p) =>
                        form.permissions.includes(p.id),
                      ).length;
                      const allSelected = selectedInGroup === group.permissions.length;
                      return (
                        <div key={group.label} className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => setGroup(group.permissions, !allSelected)}
                            className="flex w-full items-center justify-between rounded-md bg-muted/50 px-2 py-1.5 text-right"
                          >
                            <span className="text-sm font-bold">{group.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {selectedInGroup}/{group.permissions.length}
                            </span>
                          </button>
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {group.permissions.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                              >
                                <Checkbox
                                  checked={form.permissions.includes(permission.id)}
                                  onCheckedChange={() => togglePermission(permission.id)}
                                />
                                <span dir="ltr" className="truncate text-start">
                                  {permission.name}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={submit} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {editingRole ? "حفظ التغييرات" : "إنشاء"}
            </Button>
            <Button variant="outline" onClick={closeDialog}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف الدور</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف دور «{deleteTarget?.name}» نهائيًا. المستخدمون المرتبطون به سيفقدون صلاحياته. لا يمكن التراجع.
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
