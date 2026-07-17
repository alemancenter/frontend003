import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { academicApi } from "@/lib/api/academic";
import { adminAiApi, adminArticlesApi, adminFilesApi } from "@/lib/api/admin";
import type { CountryCode } from "@/lib/country";
import { VALID_COUNTRIES } from "@/lib/country";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";
import { ArrowRight, FileUp, Loader2, Save, Send, Sparkles } from "lucide-react";
import {
  FILE_CATEGORIES,
  type FileCategoryValue,
  generateKeywords,
  generateMetaDescription,
} from "./shared";

const COUNTRY_LABELS: Record<CountryCode, string> = {
  jo: "الأردن",
  sa: "السعودية",
  eg: "مصر",
  ps: "فلسطين",
};

const DUPLICATE_TITLE_MESSAGE = "العنوان مستخدم بالفعل في مقالة أخرى";

function normalizeArticleTitle(value?: string | null) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ar");
}

const articleSchema = z.object({
  title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل"),
  content: z.string().min(10, "المحتوى يجب أن يكون 10 أحرف على الأقل"),
  grade_level: z.string().optional().nullable().transform((value) => value || undefined),
  // Plain number (not z.coerce): the Selects always hand us a real number,
  // and coercion widens the form's input type to `unknown`.
  subject_id: z.number().optional().nullable().transform((value) => value || undefined),
  semester_id: z.number().optional().nullable().transform((value) => value || undefined),
  meta_description: z.string().optional().nullable().transform((value) => value || undefined),
  keywords: z.string().optional().nullable().transform((value) => value || undefined),
  status: z.number().default(1),
});

// The schema coerces/defaults, so the values the fields hold (input) differ
// from what the resolver hands to onSubmit (output).
type ArticleFormInput = z.input<typeof articleSchema>;
type ArticleFormValues = z.output<typeof articleSchema>;

export default function CreateArticle() {
  const country = useCountry();
  const switchCountry = useCountrySwitcher();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileCategory, setFileCategory] = useState<FileCategoryValue>("study_plan");
  const [titleToCheck, setTitleToCheck] = useState("");

  const form = useForm<ArticleFormInput, unknown, ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      content: "",
      grade_level: "",
      status: 1,
    },
  });

  const selectedClassId = form.watch("grade_level");
  const selectedSubjectId = form.watch("subject_id");
  const watchedTitle = form.watch("title");
  const normalizedWatchedTitle = normalizeArticleTitle(watchedTitle);

  const { data: createData, isLoading: isLoadingCreateData } = useQuery({
    queryKey: ["admin", "articles", "create-data", country],
    queryFn: () => adminArticlesApi.createData({ country }) as Promise<any>,
  });

  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["admin", "articles", "subjects", country, selectedClassId],
    queryFn: () => academicApi.listSubjects(selectedClassId!, country),
    enabled: !!selectedClassId,
  });

  const { data: semesterData, isLoading: isLoadingSemesters } = useQuery({
    queryKey: ["admin", "articles", "semesters", country, selectedSubjectId],
    queryFn: () => academicApi.listSemesters(selectedSubjectId!, country),
    enabled: !!selectedSubjectId,
  });

  const { data: titleMatches = [], isFetching: isCheckingTitle } = useQuery({
    queryKey: ["admin", "articles", "title-check", country, titleToCheck],
    queryFn: () => adminArticlesApi.list({ country, q: titleToCheck, per_page: 10 }),
    enabled: titleToCheck.length >= 3,
  });

  const isDuplicateTitle = titleMatches.some((article) => normalizeArticleTitle(article.title) === titleToCheck);

  const classes = createData?.classes || [];
  const semesters = semesterData?.semesters ?? [];

  useEffect(() => {
    form.setValue("grade_level", "");
    form.setValue("subject_id", undefined);
    form.setValue("semester_id", undefined);
    setTitleToCheck("");
  }, [country]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTitleToCheck(normalizedWatchedTitle.length >= 3 ? normalizedWatchedTitle : "");
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [normalizedWatchedTitle]);

  useEffect(() => {
    if (normalizedWatchedTitle.length < 3 && form.formState.errors.title?.type === "duplicate") {
      form.clearErrors("title");
    }
  }, [form, normalizedWatchedTitle]);

  useEffect(() => {
    if (titleToCheck.length < 3 || isCheckingTitle) return;

    if (isDuplicateTitle) {
      form.setError("title", { type: "duplicate", message: DUPLICATE_TITLE_MESSAGE });
      return;
    }

    if (form.formState.errors.title?.type === "duplicate") {
      form.clearErrors("title");
    }
  }, [form, isCheckingTitle, isDuplicateTitle, titleToCheck]);

  const uploadFiles = async (articleId: number) => {
    for (const file of selectedFiles) {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("article_id", String(articleId));
      payload.append("file_category", fileCategory);
      await adminFilesApi.upload(payload, { country });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (values: ArticleFormValues) => {
      const article = await adminArticlesApi.create(values, { country });
      if (selectedFiles.length > 0) {
        await uploadFiles(article.id);
      }
      return article;
    },
    onSuccess: () => {
      toast({
        title: selectedFiles.length > 0 ? "تم إنشاء المقالة ورفع المرفقات" : "تم إنشاء المقالة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
      setLocation("/admin/articles");
    },
    onError: (error: Error) => {
      toast({ title: "فشل إنشاء المقالة", description: error.message, variant: "destructive" });
    },
  });

  const generateAI = async () => {
    const title = form.getValues("title");
    if (!title || title.length < 5) {
      toast({
        title: "العنوان مطلوب",
        description: "يرجى إدخال عنوان مكون من 5 أحرف على الأقل للتوليد",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { job_id } = await adminAiApi.generate({
        title,
        content_type: "article",
        country_code: country,
        grade_level: form.getValues("grade_level") ?? undefined,
        subject_id: form.getValues("subject_id") ?? undefined,
        semester_id: form.getValues("semester_id") ?? undefined,
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
    } catch (error) {
      setIsGenerating(false);
      const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع";
      toast({ title: "خطأ في خدمة الذكاء الاصطناعي", description: message, variant: "destructive" });
    }
  };

  const onSubmit = (values: ArticleFormValues) => {
    if (isDuplicateTitle) {
      form.setError("title", { type: "duplicate", message: DUPLICATE_TITLE_MESSAGE }, { shouldFocus: true });
      return;
    }

    // SEO fallback: auto-generate description/keywords from the article
    // itself when the admin left them empty.
    const payload = {
      ...values,
      meta_description:
        values.meta_description ?? generateMetaDescription(values.title, values.content),
      keywords: values.keywords ?? generateKeywords(values.title, values.content),
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/admin/articles")}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إضافة مقالة جديدة</h1>
            <p className="mt-1 text-muted-foreground">أنشئ محتوى تعليميًا جديدًا وحدد قاعدة البيانات والمرفقات</p>
          </div>
        </div>
        <Select value={country} onValueChange={(value) => switchCountry(value as CountryCode)}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="قاعدة البيانات" />
          </SelectTrigger>
          <SelectContent>
            {VALID_COUNTRIES.map((code) => (
              <SelectItem key={code} value={code}>
                {COUNTRY_LABELS[code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  <Input id="title" {...form.register("title")} placeholder="مثلاً: حل أسئلة درس القواعد" />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                  {!form.formState.errors.title && isCheckingTitle && (
                    <p className="text-sm text-muted-foreground">جاري التحقق من عدم تكرار العنوان...</p>
                  )}
                  {!form.formState.errors.title && titleToCheck.length >= 3 && !isCheckingTitle && (
                    <p className="text-sm text-emerald-600">العنوان غير مستخدم في قاعدة البيانات الحالية</p>
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
                      توليد بالذكاء الاصطناعي
                    </Button>
                  </div>
                  <RichTextEditor
                    value={form.watch("content")}
                    onChange={(html) => form.setValue("content", html)}
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
                  <Label>قاعدة البيانات</Label>
                  <Select value={country} onValueChange={(value) => switchCountry(value as CountryCode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_COUNTRIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {COUNTRY_LABELS[code]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الصف الدراسي</Label>
                  <Select
                    value={form.watch("grade_level") || undefined}
                    onValueChange={(value) => {
                      form.setValue("grade_level", value);
                      form.setValue("subject_id", undefined);
                      form.setValue("semester_id", undefined);
                    }}
                    disabled={isLoadingCreateData}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCreateData ? "جاري التحميل..." : "اختر الصف"} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls: any) => (
                        <SelectItem key={cls.id} value={String(cls.id)}>
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
                    onValueChange={(value) => {
                      form.setValue("subject_id", Number(value));
                      form.setValue("semester_id", undefined);
                    }}
                    disabled={!selectedClassId || isLoadingSubjects}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={!selectedClassId ? "اختر الصف أولاً" : isLoadingSubjects ? "جاري التحميل..." : "اختر المادة"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={String(subject.id)}>
                          {subject.subject_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الفصل الدراسي</Label>
                  <Select
                    value={form.watch("semester_id")?.toString() || undefined}
                    onValueChange={(value) => form.setValue("semester_id", Number(value))}
                    disabled={!selectedSubjectId || isLoadingSemesters}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !selectedSubjectId ? "اختر المادة أولاً" : isLoadingSemesters ? "جاري التحميل..." : "اختر الفصل"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((semester) => (
                        <SelectItem key={semester.id} value={String(semester.id)}>
                          {semester.semester_name}
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
                <div className="space-y-2">
                  <Label>تصنيف الملفات</Label>
                  <Select value={fileCategory} onValueChange={(value) => setFileCategory(value as typeof fileCategory)}>
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
                  <Label htmlFor="article_files">رفع ملفات</Label>
                  <Input
                    id="article_files"
                    type="file"
                    multiple
                    onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                  />
                  {selectedFiles.length > 0 && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                      <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
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
                    onValueChange={(value) => form.setValue("status", Number(value))}
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
              <CardFooter className="grid grid-cols-1 gap-2">
                <Button type="submit" disabled={createMutation.isPending || isDuplicateTitle || isCheckingTitle}>
                  {createMutation.isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : form.watch("status") === 1 ? (
                    <Send className="ml-2 h-4 w-4" />
                  ) : (
                    <Save className="ml-2 h-4 w-4" />
                  )}
                  {createMutation.isPending ? "جاري الحفظ..." : "حفظ المقالة"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
