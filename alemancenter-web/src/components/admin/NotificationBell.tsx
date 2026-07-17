import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { adminNotificationsApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.round(hours / 24);
  return `قبل ${days} يوم`;
}

export function NotificationBell() {
  const queryClient = useQueryClient();

  // Poll the lightweight "latest" endpoint (10 items + unread count).
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "notifications", "latest"],
    queryFn: () => adminNotificationsApi.latest(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const notifications = data?.notifications ?? [];
  const unread = data?.unread_count ?? 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => adminNotificationsApi.markAsRead(id),
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => adminNotificationsApi.markAllRead(),
    onSuccess: invalidate,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="الإشعارات">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div dir="rtl" className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-bold">الإشعارات</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              تعليم الكل كمقروء
            </button>
          )}
        </div>

        <div dir="rtl" className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
              لا توجد إشعارات
            </div>
          ) : (
            notifications.map((notification) => {
              const isUnread = !notification.read_at;
              return (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => isUnread && markReadMutation.mutate(notification.id)}
                  className={`flex w-full items-start gap-2 border-b px-3 py-2.5 text-right transition hover:bg-muted/60 ${
                    isUnread ? "bg-primary/5" : ""
                  }`}
                >
                  <span
                    className={`mt-1.5 flex h-2 w-2 shrink-0 rounded-full ${
                      isUnread ? "bg-primary" : "bg-transparent"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${isUnread ? "font-bold" : "font-medium"}`}>
                      {notification.data?.title || "(بدون عنوان)"}
                    </p>
                    {notification.data?.message && (
                      <p className="truncate text-xs text-muted-foreground">{notification.data.message}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(notification.created_at)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link href="/admin/notifications">عرض كل الإشعارات</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
