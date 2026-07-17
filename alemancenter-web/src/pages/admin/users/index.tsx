import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { adminUsersApi, adminRolesApi, type UserStatus } from "@/lib/api/admin";
import type { User } from "@/lib/api/types";
import { useAuth } from "@/contexts/AuthContext";
import { imgUrl } from "@/lib/img-url";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Edit,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";

const PER_PAGE = 20;
const ALL = "all";

const STATUS_META: Record<
  UserStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; dot: string }
> = {
  active: { label: "نشط", variant: "default", dot: "bg-emerald-500" },
  inactive: { label: "غير نشط", variant: "secondary", dot: "bg-muted-foreground" },
  banned: { label: "محظور", variant: "destructive", dot: "bg-destructive" },
};

const STATUS_OPTIONS: UserStatus[] = ["active", "inactive", "banned"];

const EMPTY_CREATE = { name: "", email: "", password: "", roles: [] as number[] };

// Deterministic avatar tint from the user id, so each user keeps a stable color.
const AVATAR_TINTS = [
  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? "") + (parts[1][0] ?? "");
}

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [debouncedSearch, status, roleFilter]);

  const { data: rolesList = [] } = useQuery({
    queryKey: ["admin", "roles", "list"],
    queryFn: () => adminRolesApi.list(),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "users", debouncedSearch, status, roleFilter, page],
    queryFn: () =>
      adminUsersApi.listWithMeta({
        search: debouncedSearch || undefined,
        status: status === ALL ? undefined : (status as UserStatus),
        role: roleFilter === ALL ? undefined : roleFilter,
        page,
        per_page: PER_PAGE,
      }),
  });

  const users = data?.data ?? [];
  const meta = data?.meta ?? data?.pagination;
  const total = meta?.total ?? users.length;
  const lastPage = meta?.last_page ?? 1;

  // Global per-status counts for the summary tiles. Each is a cheap count query
  // (per_page: 1) — we only read meta.total, not the rows.
  const statusCounts = useQuery({
    queryKey: ["admin", "users", "status-counts"],
    queryFn: async () => {
      const [all, active, inactive, banned] = await Promise.all([
        adminUsersApi.listWithMeta({ per_page: 1 }),
        adminUsersApi.listWithMeta({ per_page: 1, status: "active" }),
        adminUsersApi.listWithMeta({ per_page: 1, status: "inactive" }),
        adminUsersApi.listWithMeta({ per_page: 1, status: "banned" }),
      ]);
      const readTotal = (r: typeof all) => r.meta?.total ?? r.pagination?.total ?? 0;
      return {
        all: readTotal(all),
        active: readTotal(active),
        inactive: readTotal(inactive),
        banned: readTotal(banned),
      };
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const createMutation = useMutation({
    mutationFn: () =>
      adminUsersApi.create({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        roles: createForm.roles,
      }),
    onSuccess: () => {
      toast({ title: "تم إنشاء المستخدم" });
      setIsCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل إنشاء المستخدم", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (user: User) => adminUsersApi.delete(user.id),
    onSuccess: () => {
      toast({ title: "تم حذف المستخدم" });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل حذف المستخدم", description: error.message, variant: "destructive" }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => adminUsersApi.bulkDelete(ids),
    onSuccess: (_data, ids) => {
      toast({ title: `تم حذف ${ids.length} مستخدم` });
      setSelected([]);
      setBulkDeleteOpen(false);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل الحذف الجماعي", description: error.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ ids, next }: { ids: number[]; next: UserStatus }) =>
      adminUsersApi.updateStatus(ids, next),
    onSuccess: (_data, { ids }) => {
      toast({ title: `تم تحديث حالة ${ids.length > 1 ? `${ids.length} مستخدم` : "المستخدم"}` });
      setSelected([]);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل تحديث الحالة", description: error.message, variant: "destructive" }),
  });

  // The signed-in admin must not delete or select themselves for destructive
  // bulk actions — the backend rejects it too, but we guard the UI as well.
  const isSelf = (user: User) => currentUser?.id === user.id;

  const selectableUsers = useMemo(() => users.filter((user) => !isSelf(user)), [users, currentUser]);
  const allSelected = selectableUsers.length > 0 && selected.length === selectableUsers.length;

  const toggleAll = () =>
    setSelected(allSelected ? [] : selectableUsers.map((user) => user.id));

  const toggleOne = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));

  const canSubmitCreate =
    createForm.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email.trim()) &&
    createForm.password.length >= 8;

  const hasFilters = debouncedSearch !== "" || status !== ALL || roleFilter !== ALL;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المستخدمون</h1>
          <p className="mt-1 text-muted-foreground">إدارة حسابات المستخدمين وحالاتهم وأدوارهم</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          مستخدم جديد
        </Button>
      </div>

      {/* Summary tiles — click to filter by that status */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { key: ALL, label: "إجمالي المستخدمين", value: statusCounts.data?.all, icon: CircleUserRound, tint: "bg-primary/10 text-primary" },
          { key: "active", label: "نشط", value: statusCounts.data?.active, icon: UserCheck, tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
          { key: "inactive", label: "غير نشط", value: statusCounts.data?.inactive, icon: UserX, tint: "bg-muted text-muted-foreground" },
          { key: "banned", label: "محظور", value: statusCounts.data?.banned, icon: Ban, tint: "bg-destructive/10 text-destructive" },
        ].map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => setStatus(tile.key)}
            className={`rounded-xl border bg-card p-4 text-right transition hover:shadow-sm ${
              status === tile.key ? "border-primary ring-1 ring-primary" : "hover:border-primary/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tile.tint}`}>
                <tile.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-black leading-none">
                  {statusCounts.isLoading ? "—" : (tile.value ?? 0).toLocaleString("ar-EG")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{tile.label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                قائمة المستخدمين
                <span className="ms-2 text-sm font-normal text-muted-foreground">({total})</span>
              </CardTitle>
              <CardDescription>ابحث وفلتر حسب الحالة أو الدور، وأدِر الحسابات.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-56">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو البريد..."
                  className="pr-8"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>كل الحالات</SelectItem>
                  {STATUS_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {STATUS_META[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>كل الأدوار</SelectItem>
                  {rolesList.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setStatus(ALL);
                    setRoleFilter(ALL);
                  }}
                >
                  مسح
                </Button>
              )}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium">{selected.length} مستخدم محدد</span>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={statusMutation.isPending}>
                      تغيير الحالة
                      <ChevronDown className="mr-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {STATUS_OPTIONS.map((value) => (
                      <DropdownMenuItem
                        key={value}
                        onClick={() => statusMutation.mutate({ ids: selected, next: value })}
                      >
                        {STATUS_META[value].label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="ml-2 h-4 w-4" />
                  حذف المحدد
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="تحديد الكل"
                      disabled={selectableUsers.length === 0}
                    />
                  </TableHead>
                  <TableHead className="w-[70px]">المعرف</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الأدوار</TableHead>
                  <TableHead className="w-[110px]">الحالة</TableHead>
                  <TableHead className="w-[140px] text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {hasFilters ? "لا يوجد مستخدمون مطابقون للفلاتر" : "لا يوجد مستخدمون"}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const statusMeta = STATUS_META[user.status] ?? STATUS_META.inactive;
                    const self = isSelf(user);
                    return (
                      <TableRow key={user.id} data-state={selected.includes(user.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selected.includes(user.id)}
                            onCheckedChange={() => toggleOne(user.id)}
                            aria-label={`تحديد ${user.name}`}
                            disabled={self}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">{user.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              {user.profile_photo_path && (
                                <AvatarImage
                                  src={imgUrl(user.profile_photo_path, 72) ?? undefined}
                                  alt={user.name}
                                />
                              )}
                              <AvatarFallback
                                className={`text-xs font-bold ${AVATAR_TINTS[user.id % AVATAR_TINTS.length]}`}
                              >
                                {initials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {user.name}
                                {self && <span className="ms-2 text-xs text-muted-foreground">(أنت)</span>}
                              </p>
                              {user.email_verified_at ? (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">بريد موثّق</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">غير موثّق</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell dir="ltr" className="text-start text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <Badge key={role.id} variant="outline" className="text-xs">
                                  {role.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusMeta.variant} className="gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                            {statusMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" title="الأدوار والصلاحيات" asChild>
                              <Link href={`/admin/users/${user.id}?tab=roles`}>
                                <Shield className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" title="تعديل" asChild>
                              <Link href={`/admin/users/${user.id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              title={self ? "لا يمكنك حذف حسابك" : "حذف"}
                              disabled={self}
                              onClick={() => setDeleteTarget(user)}
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

          {lastPage > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                صفحة {page} من {lastPage}
                {isFetching && <Loader2 className="ms-2 inline h-3 w-3 animate-spin" />}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1 || isFetching}
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}
                  disabled={page >= lastPage || isFetching}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create user dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>مستخدم جديد</DialogTitle>
            <DialogDescription>أنشئ حسابًا جديدًا وحدد أدواره.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">الاسم</Label>
              <Input
                id="new-name"
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="الاسم الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">البريد الإلكتروني</Label>
              <Input
                id="new-email"
                type="email"
                dir="ltr"
                value={createForm.email}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">كلمة المرور</Label>
              <Input
                id="new-password"
                type="password"
                dir="ltr"
                value={createForm.password}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="8 أحرف على الأقل"
              />
              {createForm.password.length > 0 && createForm.password.length < 8 && (
                <p className="text-xs text-destructive">كلمة المرور 8 أحرف على الأقل.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>الأدوار</Label>
              <div className="flex flex-wrap gap-2">
                {rolesList.map((role) => {
                  const checked = createForm.roles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() =>
                        setCreateForm((prev) => ({
                          ...prev,
                          roles: checked
                            ? prev.roles.filter((id) => id !== role.id)
                            : [...prev.roles, role.id],
                        }))
                      }
                      className={`rounded-md border px-3 py-1 text-sm font-medium transition ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background hover:bg-muted"
                      }`}
                    >
                      {role.name}
                    </button>
                  );
                })}
                {rolesList.length === 0 && (
                  <span className="text-sm text-muted-foreground">لا توجد أدوار معرّفة.</span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={() => createMutation.mutate()} disabled={!canSubmitCreate || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              إنشاء
            </Button>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleteTarget?.name}» ({deleteTarget?.email}) نهائيًا. لا يمكن التراجع.
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

      {/* Bulk delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف {selected.length} مستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الحسابات المحددة نهائيًا ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selected)}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف نهائيًا
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
