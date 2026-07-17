import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { adminArticlesApi, adminAiApi, adminFilesApi } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { useCountry } from "@/hooks/use-country";
import {
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  FileUp,
  Loader2,
  Save,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  FILE_CATEGORIES,
  FILE_CATEGORY_LABELS,
  type FileCategoryValue,
  formatFileSize,
  generateKeywords,
  generateMetaDescription,
} from "./shared";

const articleSchema = z.object({
  title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل"),
  content: z.string().min(10, "المحتوى يجب أن يكون 10 أحرف على الأقل"),
  grade_level: z.string().optional().nullable().transform(val => val || undefined),
  // Plain number (not z.coerce): the Selects always hand us a real number,
  // and coercion widens the form's input type to `unknown`.
  subject_id: z.number().optional().nullable().transform(val => val || undefined),
  semester_id: z.number().optional().nullable().transform(val => val || undefined),
  meta_description: z.string().optional().nullable().transform(val => val || undefined),
  keywords: z.string().optional().nullable().transform(val => val || undefined),
  status: z.number().default(1),
});

// The schema coerces/defaults, so the values the fields hold (input) differ
// from what the resolver hands to onSubmit (output).
type ArticleFormInput = z.input<typeof articleSchema>;
type ArticleFormValues = z.output<typeof articleSchema>;

interface ArticleFileRow {
  id: number;
  file_name?: string;
  original_filename?: string;
  file_type?: string;
  file_category?: string;
  file_size?: number;
}

export default function EditArticle() {
  const { id } = useParams<{ id: string }>();
  const country = useCountry();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileCategory, setFileCategory] = useState<FileCategoryValue>("study_plan");
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const { data: editData, isLoading } = useQuery({
    queryKey: ["admin", "articles", "edit", id, country],
    queryFn: () => adminArticlesApi.editData(id, { country }) as Promise<any>,
    enabled: !!id,
  });

  const form = useForm<ArticleFormInput, unknown, ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: { title: "", content: "", grade_level: "", status: 1 },
  });

  useEffect(() => {
    if (editData?.data) {
      const article = editData.data;
      form.reset({
        title: article.title,
        content: article.content,
        grade_level: article.grade_level?.toString() || "",
        subject_id: article.subject_id,
        semester_id: article.semester_id,
        meta_description: article.meta_description,
        status: article.status,
        keywords: article.keywords_rel?.map((k: any) => k.keyword).join(", ") || "",
      });
    }
  }, [editData, form]);

  const selectedGrade = form.watch("grade_level");
  const subjects = editData?.subjects || [];
  const classes = editData?.classes || [];
  const semesters = editData?.semesters || [];
  const existingFiles: ArticleFileRow[] = editData?.data?.files ?? [];

  const invalidateArticle = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
  };

  const updateMutation = useMutation({
    mutationFn: (values: ArticleFormValues) => adminArticlesApi.update(id, values, { country }),
    onSuccess: () => {
      toast({ title: "تم تحديث المقالة بنجاح" });
      invalidateArticle();
    },
    onError: (error: any) => {
      toast({ title: "فشل تحديث المقالة", description: error.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => adminArticlesApi.publish(id, { country }),
    onSuccess: () => {
      toast({ title: "تم نشر المقالة" });
      form.setValue("status", 1);
      queryClient.invalidateQueries({ queryKey: ["admin", "articles", "edit", id] });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => adminArticlesApi.unpublish(id, { country }),
    onSuccess: () => {
      toast({ title: "تم إلغاء نشر المقالة" });
      form.setValue("status", 0);
      queryClient.invalidateQueries({ queryKey: ["admin", "articles", "edit", id] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => adminFilesApi.delete(fileId, { country }),
    onSuccess: () => {
      toast({ title: "تم حذف الملف" });
      queryClient.invalidateQueries({ queryKey: ["admin", "articles", "edit", id] });
      invalidateArticle();
    },
    onError: (error: any) => {
      toast({ title: "فشل حذف الملف", description: error.message, variant: "destructive" });
    },
  });

  const uploadSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploadingFiles(true);
    try {
      for (const file of selectedFiles) {
        const payload = new FormData();
        payload.append("file", file);
        payload.append("article_id", String(id));
        payload.append("file_category", fileCategory);
        await adminFilesApi.upload(payload, { country });
      }
      toast({ title: `تم رفع ${selectedFiles.length} ملف بنجاح` });
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["admin", "articles", "edit", id] });
      invalidateArticle();
    } catch (error) {
      toast({
        title: "فشل رفع الملفات",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const generateAI = async () => {
    const title = form.getValues("title");
    if (!title || title.length < 5) {
      toast({ title: "العنوان مطلوب", description: "يرجى إدخال عنوان مكون من 5 أحرف على الأقل للتوليد", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const { job_id } = await adminAiApi.generate({
        title,
        content_type: "article",
        country_code: country,
        grade_level: form.getValues("grade_level") || undefined,
        subject_id: form.getValues("subject_id") || undefined,
        semester_id: form.getValues("semester_id") || undefined,
      });
      const poll = window.setInterval(async () => {
        try {
          const status = await adminAiApi.status(job_id);
          if (status.status === "done") {
            window.clearInterval(poll);
            form.setValue("content", status.content_html || status.content || "");
            setIsGenerating(false);
            toast({ title: "تم توليد المحتوى بنجاح" });
          } else if (status.status === "failed") {
            window.clearInterval(poll);
            setIsGenerating(false);
            toast({ title: "فشل توليد المحتوى", description: status.error, variant: "destructive" });
          }
        } catch {
          window.clearInterval(poll);
          setIsGenerating(false);
        }
      }, 3000);
    } catch (error: any) {
      setIsGenerating(false);
      toast({ title: "خطأ في خدمة الذكاء الاصطناعي", description: error.message, variant: "destructive" });
    }
  };

  const onSubmit = (values: ArticleFormValues) => {
    // SEO fallback: auto-generate description/keywords from the article
    // itself when the admin left them empty.
    const payload = {
      ...values,
      meta_description:
        values.meta_description ?? generateMetaDescription(values.title, values.content),
      keywords: values.keywords ?? generateKeywords(values.title, values.content),
    };
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/admin/articles")}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تعديل المقالة</h1>
            <p className="mt-1 max-w-xl truncate text-muted-foreground">{editData?.data?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editData?.data?.status === 1 ? (
            <Button variant="outline" onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}>
              <EyeOff className="ml-2 h-4 w-4" />
              إلغاء النشر
            </Button>
          ) : (
            <Button variant="outline" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              <Send className="ml-2 h-4 w-4" />
              نشر الآن
            </Button>
          )}
          <Button variant="ghost" size="icon" title="عرض المقالة" asChild>
            <a href={`/${country}/lesson/articles/${id}`} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>محتوى المقالة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">العنوان</Label>
                  <Input id="title" {...form.register("title")} />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Label>المحتوى</Label>
                    <Button type="button" variant="outline" size="sm" onClick={generateAI} disabled={isGenerating}>
                      {isGenerating ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="ml-2 h-4 w-4 text-primary" />
                      )}
                      إعادة توليد بالذكاء الاصطناعي
                    </Button>
                  </div>
                  <RichTextEditor
                    value={form.watch("content")}
                    onChange={(html) => form.setValue("content", html, { shouldValidate: true })}
                    placeholder="اكتب محتوى المقالة هنا..."
                    minHeight="280px"
                    maxHeight="420px"
                    error={!!form.formState.errors.content}
                  />
                  {form.formState.errors.content && (
                    <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تحسين محركات البحث</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_description">الوصف</Label>
                  <Textarea
                    id="meta_description"
                    {...form.register("meta_description")}
                    placeholder="وصف قصير يظهر في نتائج البحث..."
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    إذا تُرك فارغًا يُولَّد تلقائيًا من محتوى المقالة عند الحفظ.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords">الكلمات المفتاحية</Label>
                  <Input id="keywords" {...form.register("keywords")} placeholder="تعليم، قواعد، لغة عربية" />
                  <p className="text-xs text-muted-foreground">
                    إذا تُركت فارغة تُولَّد تلقائيًا من العنوان والمحتوى عند الحفظ.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>التصنيف التعليمي</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>الصف الدراسي</Label>
                  <Select
                    value={form.watch("grade_level") || undefined}
                    onValueChange={(val) => form.setValue("grade_level", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الصف" />
                    </SelectTrigger>
                    {/* grade_level must hold the class id: subjects/semesters reference
                        school_classes.id through their (misnamed) grade_level column. */}
                    <SelectContent>
                      {classes.map((cls: any) => (
                        <SelectItem key={cls.id} value={cls.id.toString()}>
                          {cls.grade_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المادة</Label>
                  <Select
                    value={form.watch("subject_id")?.toString() || undefined}
                    onValueChange={(val) => form.setValue("subject_id", parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المادة" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects
                        .filter((s: any) => !selectedGrade || s.grade_level.toString() === selectedGrade)
                        .map((sub: any) => (
                          <SelectItem key={sub.id} value={sub.id.toString()}>
                            {sub.subject_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الفصل الدراسي</Label>
                  <Select
                    value={form.watch("semester_id")?.toString() || undefined}
                    onValueChange={(val) => form.setValue("semester_id", parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفصل" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters
                        .filter((s: any) => !selectedGrade || s.grade_level.toString() === selectedGrade)
                        .map((sem: any) => (
                          <SelectItem key={sem.id} value={sem.id.toString()}>
                            {sem.semester_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>المرفقات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {existingFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>الملفات الحالية ({existingFiles.length})</Label>
                    {existingFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium" title={file.file_name ?? file.original_filename}>
                            {file.file_name ?? file.original_filename ?? `ملف ${file.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[
                              file.file_category ? FILE_CATEGORY_LABELS[file.file_category] ?? file.file_category : null,
                              file.file_type?.toUpperCase(),
                              formatFileSize(file.file_size),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                          title="حذف الملف"
                          disabled={deleteFileMutation.isPending}
                          onClick={() => {
                            if (window.confirm("هل أنت متأكد من حذف هذا الملف نهائيًا؟")) {
                              deleteFileMutation.mutate(file.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>تصنيف الملفات الجديدة</Label>
                  <Select value={fileCategory} onValueChange={(value) => setFileCategory(value as FileCategoryValue)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILE_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="article_files">رفع ملفات جديدة</Label>
                  <Input
                    id="article_files"
                    type="file"
                    multiple
                    onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                  />
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <FileUp className="h-4 w-4" />
                        {selectedFiles.length} ملفات محددة
                      </div>
                      <ul className="space-y-1">
                        {selectedFiles.map((file) => (
                          <li key={`${file.name}-${file.size}`} className="truncate">
                            {file.name}
                          </li>
                        ))}
                      </ul>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        onClick={uploadSelectedFiles}
                        disabled={isUploadingFiles}
                      >
                        {isUploadingFiles ? (
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileUp className="ml-2 h-4 w-4" />
                        )}
                        {isUploadingFiles ? "جاري الرفع..." : "رفع الملفات الآن"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الإعدادات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select
                    onValueChange={(val) => form.setValue("status", parseInt(val))}
                    value={String(form.watch("status"))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">مسودة</SelectItem>
                      <SelectItem value="1">منشور</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="ml-2 h-4 w-4" />
                  )}
                  {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
