import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminNotificationsApi, adminRolesApi, adminUsersApi } from "@/lib/api/admin";
import type { AppNotification, User } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Bell, CheckCheck, Loader2, Megaphone, Plus, Send, Trash2 } from "lucide-react";

type Audience = "all" | "role" | "user";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EMPTY_COMPOSE = { title: "", message: "", action_url: "" };

export default function Notifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppNotification | null>(null);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [audience, setAudience] = useState<Audience>("all");
  const [role, setRole] = useState("");
  const [recipient, setRecipient] = useState<User | null>(null);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [compose, setCompose] = useState(EMPTY_COMPOSE);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin", "notifications", "list", unreadOnly],
    queryFn: () => adminNotificationsApi.list({ unread: unreadOnly ? 1 : 0, per_page: 100 }),
  });

  const { data: rolesList = [] } = useQuery({
    queryKey: ["admin", "roles", "list"],
    queryFn: () => adminRolesApi.list(),
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(recipientQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [recipientQuery]);

  const recipientResults = useQuery({
    queryKey: ["admin", "users", "search", debouncedQuery],
    queryFn: () => adminUsersApi.search(debouncedQuery),
    enabled: isComposeOpen && audience === "user" && debouncedQuery.length >= 2 && !recipient,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });

  const resetCompose = () => {
    setCompose(EMPTY_COMPOSE);
    setAudience("all");
    setRole("");
    setRecipient(null);
    setRecipientQuery("");
  };

  const sendMutation = useMutation<unknown, Error>({
    mutationFn: () => {
      const base = {
        title: compose.title.trim(),
        message: compose.message.trim(),
        action_url: compose.action_url.trim() || undefined,
      };
      if (audience === "user" && recipient) {
        return adminNotificationsApi.create({ ...base, target_user_id: recipient.id });
      }
      return adminNotificationsApi.broadcast({
        ...base,
        role: audience === "role" ? role : undefined,
      });
    },
    onSuccess: () => {
      const target =
        audience === "all" ? "لجميع المستخدمين" : audience === "role" ? `لدور ${role}` : `إلى ${recipient?.name}`;
      toast({ title: "تم إرسال الإشعار", description: target });
      setIsComposeOpen(false);
      resetCompose();
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل إرسال الإشعار", description: error.message, variant: "destructive" }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => adminNotificationsApi.markAsRead(id),
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => adminNotificationsApi.markAllRead(),
    onSuccess: () => {
      toast({ title: "تم تعليم الكل كمقروء" });
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notification: AppNotification) => adminNotificationsApi.delete(notification.id),
    onSuccess: () => {
      toast({ title: "تم حذف الإشعار" });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل الحذف", description: error.message, variant: "destructive" }),
  });

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications]);

  const canSend =
    compose.title.trim().length >= 1 &&
    compose.message.trim().length >= 1 &&
    (audience !== "role" || role !== "") &&
    (audience !== "user" || !!recipient);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الإشعارات</h1>
          <p className="mt-1 text-muted-foreground">
            إرسال الإشعارات للمستخدمين وإدارة إشعاراتك
            {unreadCount > 0 && <span className="ms-2 font-bold text-primary">({unreadCount} غير مقروءة)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
              <CheckCheck className="ml-2 h-4 w-4" />
              تعليم الكل كمقروء
            </Button>
          )}
          <Button
            onClick={() => {
              resetCompose();
              setIsComposeOpen(true);
            }}
          >
            <Plus className="ml-2 h-4 w-4" />
            إشعار جديد
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                إشعاراتي
                <span className="ms-2 text-sm font-normal text-muted-foreground">({notifications.length})</span>
              </CardTitle>
              <CardDescription>الإشعارات الموجهة إليك. اضغط على إشعار لتعليمه كمقروء.</CardDescription>
            </div>
            <Select value={unreadOnly ? "unread" : "all"} onValueChange={(value) => setUnreadOnly(value === "unread")}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="unread">غير مقروءة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]" />
                  <TableHead>العنوان</TableHead>
                  <TableHead>النص</TableHead>
                  <TableHead className="w-[170px]">التاريخ</TableHead>
                  <TableHead className="w-[80px] text-left">حذف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <Bell className="mb-2 h-8 w-8 text-muted-foreground/50" />
                        <span>{unreadOnly ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notification) => {
                    const unread = !notification.read_at;
                    return (
                      <TableRow
                        key={notification.id}
                        className={`cursor-pointer ${unread ? "bg-primary/5 font-medium" : ""}`}
                        onClick={() => unread && markReadMutation.mutate(notification.id)}
                      >
                        <TableCell>
                          {unread ? (
                            <span className="flex h-2.5 w-2.5 rounded-full bg-primary" title="غير مقروء" />
                          ) : (
                            <Bell className="h-4 w-4 text-muted-foreground/50" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {notification.data?.title || "(بدون عنوان)"}
                        </TableCell>
                        <TableCell className="max-w-[360px]">
                          <p className="truncate text-muted-foreground">{notification.data?.message || "—"}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(notification.created_at)}
                        </TableCell>
                        <TableCell className="text-left" onClick={(event) => event.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            title="حذف"
                            onClick={() => setDeleteTarget(notification)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Compose dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>إشعار جديد</DialogTitle>
            <DialogDescription>أرسل إشعارًا لجميع المستخدمين أو لدور أو لمستخدم محدد.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الجمهور المستهدف</Label>
              <Select
                value={audience}
                onValueChange={(value) => {
                  setAudience(value as Audience);
                  setRecipient(null);
                  setRole("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  <SelectItem value="role">دور محدد</SelectItem>
                  <SelectItem value="user">مستخدم محدد</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {audience === "role" && (
              <div className="space-y-2">
                <Label>الدور</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesList.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {audience === "user" && (
              <div className="space-y-2">
                <Label>المستخدم</Label>
                {recipient ? (
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{recipient.name}</p>
                      <p dir="ltr" className="text-start text-xs text-muted-foreground">{recipient.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setRecipient(null)}>
                      تغيير
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      value={recipientQuery}
                      onChange={(event) => setRecipientQuery(event.target.value)}
                      placeholder="ابحث بالاسم أو البريد (حرفان على الأقل)..."
                    />
                    {debouncedQuery.length >= 2 && (
                      <div className="mt-1 max-h-40 overflow-y-auto rounded-md border">
                        {recipientResults.isLoading ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">
                            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                          </div>
                        ) : (recipientResults.data ?? []).length === 0 ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">لا نتائج</div>
                        ) : (
                          recipientResults.data!.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setRecipient(item);
                                setRecipientQuery("");
                              }}
                              className="flex w-full flex-col items-start px-3 py-2 text-right hover:bg-muted"
                            >
                              <span className="text-sm font-medium">{item.name}</span>
                              <span dir="ltr" className="text-xs text-muted-foreground">{item.email}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notif-title">العنوان</Label>
              <Input
                id="notif-title"
                value={compose.title}
                onChange={(event) => setCompose((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="عنوان الإشعار"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-message">النص</Label>
              <Textarea
                id="notif-message"
                value={compose.message}
                onChange={(event) => setCompose((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="نص الإشعار..."
                className="min-h-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-url">رابط الإجراء (اختياري)</Label>
              <Input
                id="notif-url"
                dir="ltr"
                value={compose.action_url}
                onChange={(event) => setCompose((prev) => ({ ...prev, action_url: event.target.value }))}
                placeholder="/articles/123"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={() => sendMutation.mutate()} disabled={!canSend || sendMutation.isPending}>
              {sendMutation.isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : audience === "all" ? (
                <Megaphone className="ml-2 h-4 w-4" />
              ) : (
                <Send className="ml-2 h-4 w-4" />
              )}
              إرسال
            </Button>
            <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف الإشعار</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف هذا الإشعار من قائمتك. لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
