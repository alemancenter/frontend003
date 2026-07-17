import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi, adminRolesApi } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Calendar, 
  ArrowRight, 
  Save, 
  Loader2,
  Lock,
  Unlock,
  AlertTriangle,
  History
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function UserDetail() {
  const [, params] = useRoute("/admin/users/:id");
  const userId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get("tab");
    if (tab && ["profile", "roles", "activity"].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["admin", "users", "detail", userId],
    queryFn: () => adminUsersApi.show(userId!),
    enabled: !!userId,
  });

  const { data: allRoles } = useQuery({
    queryKey: ["admin", "roles", "list"],
    queryFn: () => adminRolesApi.list(),
  });

  const { data: allPermissions } = useQuery({
    queryKey: ["admin", "permissions", "list"],
    queryFn: () => adminRolesApi.listPermissions(),
  });

  // State for forms
  const [profileForm, setProfileForm] = useState<{
    name: string;
    email: string;
    status: "active" | "inactive" | "banned";
  }>({
    name: "",
    email: "",
    status: "active",
  });

  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        status: (user.status as "active" | "inactive" | "banned") || "active",
      });
      setSelectedRoles(user.roles?.map(r => r.id) || []);
      setSelectedPermissions(user.permissions?.map(p => p.id) || []);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<typeof profileForm>) => adminUsersApi.update(userId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "تم تحديث الملف الشخصي بنجاح" });
    },
    onError: (err: any) => {
      toast({ 
        title: "فشل التحديث", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });

  const updateRolesPermissionsMutation = useMutation({
    mutationFn: () => adminUsersApi.updateRolesPermissions(userId!, {
      roles: selectedRoles,
      permissions: selectedPermissions,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "تم تحديث الصلاحيات بنجاح" });
    },
    onError: (err: any) => {
      toast({ 
        title: "فشل تحديث الصلاحيات", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });

  const toggleRole = (roleId: number) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const togglePermission = (permId: number) => {
    setSelectedPermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">المستخدم غير موجود</h2>
        <Link href="/admin/users">
          <Button variant="link" className="mt-4">العودة لقائمة المستخدمين</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
            <p className="text-muted-foreground mt-1">المعرف: {user.id} • {user.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {user.status === "banned" ? (
            <Button 
              variant="outline" 
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => updateProfileMutation.mutate({ status: "active" })}
            >
              <Unlock className="ml-2 h-4 w-4" />
              إلغاء الحظر
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="text-destructive hover:bg-destructive/5"
              onClick={() => updateProfileMutation.mutate({ status: "banned" })}
            >
              <Lock className="ml-2 h-4 w-4" />
              حظر المستخدم
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">
            <UserIcon className="w-4 h-4 ml-2" />
            الملف الشخصي
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="w-4 h-4 ml-2" />
            الأدوار والصلاحيات
          </TabsTrigger>
          <TabsTrigger value="activity">
            <History className="w-4 h-4 ml-2" />
            النشاط
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>المعلومات الأساسية</CardTitle>
                <CardDescription>تحديث بيانات المستخدم الأساسية</CardDescription>
              </CardHeader>
              <CardContent>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateProfileMutation.mutate(profileForm);
                  }} 
                  className="space-y-4"
                >
                  <div className="grid gap-2">
                    <Label htmlFor="name">الاسم</Label>
                    <Input 
                      id="name" 
                      value={profileForm.name} 
                      onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={profileForm.email} 
                      onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                      dir="ltr"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">الحالة</Label>
                    <Select 
                      value={profileForm.status} 
                      onValueChange={v => setProfileForm({...profileForm, status: v as "active" | "inactive" | "banned"})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="inactive">غير نشط</SelectItem>
                        <SelectItem value="banned">محظور</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    <Save className="ml-2 h-4 w-4" />
                    حفظ التغييرات
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>نظرة عامة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center">
                      <Calendar className="w-4 h-4 ml-2" />
                      تاريخ الانضمام
                    </span>
                    <span>{user.created_at ? format(new Date(user.created_at), "PPP", { locale: ar }) : "-"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center">
                      <Mail className="w-4 h-4 ml-2" />
                      تحقق البريد
                    </span>
                    {user.email_verified_at ? (
                      <Badge variant="default" className="bg-green-500">تم التحقق</Badge>
                    ) : (
                      <Badge variant="secondary">لم يتم التحقق</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center">
                      <Shield className="w-4 h-4 ml-2" />
                      إجمالي الأدوار
                    </span>
                    <span>{user.roles?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {user.status === "banned" && (
                <Card className="border-destructive bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center">
                      <AlertTriangle className="w-5 h-5 ml-2" />
                      حساب محظور
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      هذا المستخدم محظور حالياً من الوصول إلى النظام. يمكنك إلغاء الحظر من خلال زر "إلغاء الحظر" في الأعلى.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>إدارة الصلاحيات</CardTitle>
                <CardDescription>تعيين الأدوار والصلاحيات المباشرة للمستخدم</CardDescription>
              </div>
              <Button 
                onClick={() => updateRolesPermissionsMutation.mutate()} 
                disabled={updateRolesPermissionsMutation.isPending}
              >
                {updateRolesPermissionsMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                <Save className="ml-2 h-4 w-4" />
                حفظ الصلاحيات
              </Button>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">الأدوار (Roles)</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allRoles?.map(role => (
                    <div key={role.id} className="flex items-center space-x-2 space-x-reverse border p-3 rounded-md hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id={`role-${role.id}`} 
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <Label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer font-medium">
                        {role.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">صلاحيات إضافية (Direct Permissions)</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allPermissions?.map(perm => (
                    <div key={perm.id} className="flex items-center space-x-2 space-x-reverse border p-3 rounded-md hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id={`perm-${perm.id}`} 
                        checked={selectedPermissions.includes(perm.id)}
                        onCheckedChange={() => togglePermission(perm.id)}
                      />
                      <Label htmlFor={`perm-${perm.id}`} className="flex-1 cursor-pointer">
                        {perm.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>سجل النشاط</CardTitle>
              <CardDescription>آخر العمليات التي قام بها المستخدم</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العملية</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>عنوان IP</TableHead>
                      <TableHead>التفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        لا يوجد سجل نشاط متاح حالياً لهذا المستخدم
                      </TableCell>
                    </TableRow>
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
