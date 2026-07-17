import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminMessagesApi, adminUsersApi } from "@/lib/api/admin";
import type { InternalMessage, User } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import {
  Loader2,
  Mail,
  MailOpen,
  Plus,
  Send,
  Star,
  Trash2,
} from "lucide-react";

type Folder = "inbox" | "sent" | "drafts";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Messages() {
  const country = useCountry();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [folder, setFolder] = useState<Folder>("inbox");
  const [active, setActive] = useState<InternalMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InternalMessage | null>(null);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [recipient, setRecipient] = useState<User | null>(null);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [debouncedRecipientQuery, setDebouncedRecipientQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const inbox = useQuery({
    queryKey: ["admin", "messages", "inbox", country],
    queryFn: () => adminMessagesApi.inbox({ country }),
  });
  const sent = useQuery({
    queryKey: ["admin", "messages", "sent", country],
    queryFn: () => adminMessagesApi.sent({ country }),
    enabled: folder === "sent",
  });
  const drafts = useQuery({
    queryKey: ["admin", "messages", "drafts", country],
    queryFn: () => adminMessagesApi.drafts({ country }),
    enabled: folder === "drafts",
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedRecipientQuery(recipientQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [recipientQuery]);

  const recipientResults = useQuery({
    queryKey: ["admin", "users", "search", debouncedRecipientQuery],
    queryFn: () => adminUsersApi.search(debouncedRecipientQuery),
    enabled: isComposeOpen && debouncedRecipientQuery.length >= 2 && !recipient,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => adminMessagesApi.markAsRead(id, { country }),
    onSuccess: invalidate,
  });

  const importantMutation = useMutation({
    mutationFn: (id: number) => adminMessagesApi.toggleImportant(id, { country }),
    onSuccess: invalidate,
    onError: (error: Error) =>
      toast({ title: "تعذر تحديث التمييز", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (message: InternalMessage) => adminMessagesApi.delete(message.id, { country }),
    onSuccess: () => {
      toast({ title: "تم حذف الرسالة" });
      setDeleteTarget(null);
      setActive(null);
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل الحذف", description: error.message, variant: "destructive" }),
  });

  const resetCompose = () => {
    setRecipient(null);
    setRecipientQuery("");
    setSubject("");
    setBody("");
  };

  const sendMutation = useMutation({
    mutationFn: () =>
      adminMessagesApi.send(
        { recipient_id: recipient!.id, subject: subject.trim(), body: body.trim() },
        { country },
      ),
    onSuccess: () => {
      toast({ title: "تم إرسال الرسالة" });
      setIsComposeOpen(false);
      resetCompose();
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل إرسال الرسالة", description: error.message, variant: "destructive" }),
  });

  const draftMutation = useMutation({
    mutationFn: () =>
      adminMessagesApi.saveDraft(
        {
          recipient_id: recipient?.id,
          subject: subject.trim() || undefined,
          body: body.trim() || undefined,
        },
        { country },
      ),
    onSuccess: () => {
      toast({ title: "تم حفظ المسودة" });
      setIsComposeOpen(false);
      resetCompose();
      invalidate();
    },
    onError: (error: Error) =>
      toast({ title: "فشل حفظ المسودة", description: error.message, variant: "destructive" }),
  });

  const openMessage = (message: InternalMessage) => {
    setActive(message);
    if (folder === "inbox" && !message.read) markReadMutation.mutate(message.id);
  };

  const activeQuery = folder === "inbox" ? inbox : folder === "sent" ? sent : drafts;
  const messages = activeQuery.data ?? [];
  const unreadInbox = useMemo(() => (inbox.data ?? []).filter((m) => !m.read).length, [inbox.data]);

  const canSend = !!recipient && subject.trim().length >= 1 && body.trim().length >= 1;
  const canDraft = subject.trim().length >= 1 || body.trim().length >= 1;

  // The "person" column shows sender for inbox, recipient for sent/drafts.
  const counterparty = (message: InternalMessage) =>
    folder === "inbox" ? message.sender?.name : message.recipient?.name;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الرسائل الداخلية</h1>
          <p className="mt-1 text-muted-foreground">
            المراسلات بين أعضاء فريق الإدارة
            {unreadInbox > 0 && <span className="ms-2 font-bold text-primary">({unreadInbox} غير مقروءة)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              resetCompose();
              setIsComposeOpen(true);
            }}
          >
            <Plus className="ml-2 h-4 w-4" />
            رسالة جديدة
          </Button>
          <AdminCountrySelect />
        </div>
      </div>

      <Tabs value={folder} onValueChange={(value) => setFolder(value as Folder)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <Mail className="h-4 w-4" />
            الوارد
            {unreadInbox > 0 && (
              <span className="rounded-full bg-background px-1.5 text-xs font-bold text-foreground shadow-sm">
                {unreadInbox}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="h-4 w-4" />
            المرسلة
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-2">
            <MailOpen className="h-4 w-4" />
            المسودات
          </TabsTrigger>
        </TabsList>

        <TabsContent value={folder} className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>
                {folder === "inbox" ? "البريد الوارد" : folder === "sent" ? "الرسائل المرسلة" : "المسودات"}
                <span className="ms-2 text-sm font-normal text-muted-foreground">({messages.length})</span>
              </CardTitle>
              <CardDescription>اضغط على أي رسالة لقراءتها كاملة.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]" />
                      <TableHead className="w-[40px]" />
                      <TableHead>{folder === "inbox" ? "المرسل" : "المستلم"}</TableHead>
                      <TableHead>الموضوع</TableHead>
                      <TableHead className="w-[170px]">التاريخ</TableHead>
                      <TableHead className="w-[80px] text-left">حذف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : messages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          <div className="flex flex-col items-center">
                            <Mail className="mb-2 h-8 w-8 text-muted-foreground/50" />
                            <span>لا توجد رسائل</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      messages.map((message) => {
                        const unread = folder === "inbox" && !message.read;
                        return (
                          <TableRow
                            key={message.id}
                            className={`cursor-pointer ${unread ? "bg-primary/5 font-medium" : ""}`}
                            onClick={() => openMessage(message)}
                          >
                            <TableCell onClick={(event) => event.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => importantMutation.mutate(message.id)}
                                title={message.is_important ? "إلغاء التمييز" : "تمييز كمهم"}
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    message.is_important
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground/40"
                                  }`}
                                />
                              </button>
                            </TableCell>
                            <TableCell>
                              {unread ? (
                                <span className="flex h-2.5 w-2.5 rounded-full bg-primary" title="غير مقروءة" />
                              ) : (
                                <MailOpen className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="truncate">{counterparty(message) || "—"}</TableCell>
                            <TableCell className="max-w-[280px]">
                              <p className="truncate">{message.subject || "(بدون موضوع)"}</p>
                              <p className="truncate text-xs text-muted-foreground">{message.body}</p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(message.created_at)}
                            </TableCell>
                            <TableCell className="text-left" onClick={(event) => event.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                title="حذف"
                                onClick={() => setDeleteTarget(message)}
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
        </TabsContent>
      </Tabs>

      {/* Compose dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>رسالة جديدة</DialogTitle>
            <DialogDescription>أرسل رسالة إلى عضو من فريق الإدارة.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المستلم</Label>
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
                <div className="relative">
                  <Input
                    value={recipientQuery}
                    onChange={(event) => setRecipientQuery(event.target.value)}
                    placeholder="ابحث بالاسم أو البريد (حرفان على الأقل)..."
                  />
                  {debouncedRecipientQuery.length >= 2 && (
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-md border">
                      {recipientResults.isLoading ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                        </div>
                      ) : (recipientResults.data ?? []).length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">لا نتائج</div>
                      ) : (
                        recipientResults.data!.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setRecipient(user);
                              setRecipientQuery("");
                            }}
                            className="flex w-full flex-col items-start px-3 py-2 text-right hover:bg-muted"
                          >
                            <span className="text-sm font-medium">{user.name}</span>
                            <span dir="ltr" className="text-xs text-muted-foreground">{user.email}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="msg-subject">الموضوع</Label>
              <Input
                id="msg-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="موضوع الرسالة"
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="msg-body">النص</Label>
              <Textarea
                id="msg-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="min-h-32"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={() => sendMutation.mutate()} disabled={!canSend || sendMutation.isPending}>
              {sendMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
              إرسال
            </Button>
            <Button
              variant="outline"
              onClick={() => draftMutation.mutate()}
              disabled={!canDraft || draftMutation.isPending}
            >
              {draftMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حفظ كمسودة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Read dialog */}
      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              {active?.is_important && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
              {active?.subject || "(بدون موضوع)"}
            </DialogTitle>
            <DialogDescription>{active && formatDateTime(active.created_at)}</DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <span className="text-muted-foreground">
                  {folder === "inbox" ? "من: " : "إلى: "}
                </span>
                <span className="font-medium">{counterparty(active) || "—"}</span>
              </div>
              <p className="whitespace-pre-wrap rounded-lg border p-3 text-sm leading-relaxed">{active.body}</p>
              <div className="flex justify-start">
                <Button variant="outline" className="text-destructive" onClick={() => setDeleteTarget(active)}>
                  <Trash2 className="ml-2 h-4 w-4" />
                  حذف
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف الرسالة</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف هذه الرسالة نهائيًا. لا يمكن التراجع.</AlertDialogDescription>
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
