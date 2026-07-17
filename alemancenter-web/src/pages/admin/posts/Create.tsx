import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { adminAiApi, adminCategoriesApi, adminPostsApi } from "@/lib/api/admin";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import { VALID_COUNTRIES, type CountryCode } from "@/lib/country";
import { generateKeywords, generateMetaDescription } from "../articles/shared";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Save,
  SearchCheck,
  Sparkles,
  Star,
  Tag,
  Upload,
} from "lucide-react";

const postSchema = z.object({
  title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل").max(500, "العنوان طويل جدًا"),
  content: z.string().min(10, "المحتوى يجب أن يكون 10 أحرف على الأقل"),
  // Plain number, not z.coerce: coercing an unset field yields NaN, which
  // surfaces as an "invalid_type / received NaN" error instead of a clean
  // "required" message. The Select already hands us a real number.
  category_id: z.number({ error: "التصنيف مطلوب" }).int().positive("التصنيف مطلوب"),
  status: z.number().default(1),
  is_featured: z.boolean().default(false),
  alt: z.string().max(255, "النص البديل يجب ألا يتجاوز 255 حرفًا").optional(),
  meta_description: z.string().max(500, "الوصف التعريفي يجب ألا يتجاوز 500 حرف").optional(),
  keywords: z.string().optional(),
  image: z.any().optional(),
  attachments: z.any().optional(),
});

// The schema coerces/defaults, so the values the fields hold (input) differ
// from what the resolver hands to onSubmit (output).
type PostFormInput = z.input<typeof postSchema>;
type PostFormValues = z.output<typeof postSchema>;

function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const COUNTRY_LABELS: Record<CountryCode, string> = {
  jo: "الأردن",
  sa: "السعودية",
  eg: "مصر",
  ps: "فلسطين",
};

export default function CreatePost() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const country = useCountry();
  const [isGenerating, setIsGenerating] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["admin", "categories", "list", country],
    queryFn: () => adminCategoriesApi.list({ country }),
  });

  const form = useForm<PostFormInput, unknown, PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
      category_id: undefined,
      status: 1,
      is_featured: false,
      alt: "",
      meta_description: "",
      keywords: "",
      attachments: [],
    },
  });

  const watchedTitle = form.watch("title").trim();
  const categoryId = form.watch("category_id");
  const image = form.watch("image") as File | undefined;
  const attachments = (form.watch("attachments") ?? []) as File[];

  // Debounce the title so we don't fire a duplicate-check on every keystroke.
  const [titleToCheck, setTitleToCheck] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTitleToCheck(watchedTitle.length >= 3 ? watchedTitle : "");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [watchedTitle]);

  // Duplicate-title check across ALL country databases, not just the current one.
  const titleCheckQuery = useQuery({
    queryKey: ["admin", "posts", "title-check-all", titleToCheck],
    queryFn: async () =>
      Promise.all(
        VALID_COUNTRIES.map(async (code) => {
          try {
            const posts = await adminPostsApi.list({ country: code, search: titleToCheck, per_page: 10 });
            return { code, posts };
          } catch {
            // A single unreachable DB must not break the whole check.
            return { code, posts: [] };
          }
        }),
      ),
    enabled: titleToCheck.length >= 3,
  });

  const duplicateCountries = useMemo(() => {
    const normalized = normalizeTitle(titleToCheck);
    if (!normalized) return [] as CountryCode[];
    return (titleCheckQuery.data ?? [])
      .filter(({ posts }) => posts.some((post) => normalizeTitle(post.title) === normalized))
      .map(({ code }) => code);
  }, [titleCheckQuery.data, titleToCheck]);

  const isTitleDuplicate = duplicateCountries.length > 0;

  const createMutation = useMutation({
    mutationFn: (values: PostFormValues) =>
      adminPostsApi.create(
        {
          title: values.title,
          content: values.content,
          category_id: values.category_id,
          alt: values.alt || undefined,
          meta_description: values.meta_description || undefined,
          keywords: values.keywords || undefined,
          is_active: values.status === 1,
          is_featured: values.is_featured,
          image: values.image instanceof File ? values.image : undefined,
          attachments: Array.isArray(values.attachments) ? values.attachments : undefined,
        },
        { country },
      ),
    onSuccess: () => {
      toast({ title: "تم إنشاء المنشور بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
      setLocation("/admin/posts");
    },
    onError: (error: Error) => {
      toast({ title: "فشل إنشاء المنشور", description: error.message, variant: "destructive" });
    },
  });

  const generateAI = async () => {
    const title = form.getValues("title").trim();
    if (title.length < 5) {
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
        content_type: "post",
        category_id: categoryId || undefined,
      });

      const poll = window.setInterval(async () => {
        try {
          const status = await adminAiApi.status(job_id);
          if (status.status === "done") {
            window.clearInterval(poll);
            form.setValue("content", status.content_html || status.content || "", { shouldValidate: true });
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

  const onSubmit = (values: PostFormValues) => {
    if (isTitleDuplicate) {
      toast({ title: "العنوان مستخدم مسبقًا", description: "يرجى اختيار عنوان مختلف.", variant: "destructive" });
      return;
    }

    // SEO fallback: auto-generate description/keywords/alt from the post
    // itself when left empty.
    const payload = {
      ...values,
      meta_description:
        values.meta_description?.trim() || generateMetaDescription(values.title, values.content),
      keywords: values.keywords?.trim() || generateKeywords(values.title, values.content),
      alt: values.alt?.trim() || values.title.trim(),
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/admin/posts")}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">إضافة منشور جديد</h1>
            <p className="mt-1 text-muted-foreground">إنشاء منشور كامل مع التصنيف وتحسينات البحث والملفات</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <AdminCountrySelect />
          <Button
            type="submit"
            form="create-post-form"
            disabled={createMutation.isPending || isTitleDuplicate || titleCheckQuery.isFetching}
          >
            {createMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            حفظ المنشور
          </Button>
        </div>
      </div>

      <form id="create-post-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                محتوى المنشور
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="title">العنوان</Label>
                  {titleToCheck.length >= 3 && (
                    <Badge variant={isTitleDuplicate ? "destructive" : "secondary"} className="gap-1">
                      {titleCheckQuery.isFetching ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isTitleDuplicate ? (
                        <SearchCheck className="h-3 w-3" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {titleCheckQuery.isFetching
                        ? "جاري التحقق في كل قواعد البيانات"
                        : isTitleDuplicate
                          ? "عنوان مكرر"
                          : "عنوان متاح في كل قواعد البيانات"}
                    </Badge>
                  )}
                </div>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="مثلاً: تنبيه بخصوص موعد الامتحان"
                  aria-invalid={!!form.formState.errors.title || isTitleDuplicate}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                )}
                {isTitleDuplicate && (
                  <p className="text-sm text-destructive">
                    هذا العنوان موجود مسبقًا في: {duplicateCountries.map((code) => COUNTRY_LABELS[code]).join("، ")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label>المحتوى</Label>
                  <Button type="button" variant="outline" size="sm" onClick={generateAI} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4 text-primary" />}
                    توليد بالذكاء الاصطناعي
                  </Button>
                </div>
                <RichTextEditor
                  value={form.watch("content")}
                  onChange={(html) => form.setValue("content", html, { shouldValidate: true })}
                  placeholder="اكتب محتوى المنشور هنا..."
                  minHeight="420px"
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
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                تحسين محركات البحث
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="meta_description">الوصف التعريفي</Label>
                <Textarea
                  id="meta_description"
                  {...form.register("meta_description")}
                  placeholder="وصف قصير يظهر لمحركات البحث"
                  className="min-h-24"
                />
                {form.formState.errors.meta_description && (
                  <p className="text-sm text-destructive">{form.formState.errors.meta_description.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  إذا تُرك فارغًا يُولَّد تلقائيًا من محتوى المنشور عند الحفظ.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">الكلمات المفتاحية</Label>
                <Input id="keywords" {...form.register("keywords")} placeholder="تعليم، دراسة، امتحانات" />
                <p className="text-xs text-muted-foreground">
                  إذا تُركت فارغة تُولَّد تلقائيًا من العنوان والمحتوى عند الحفظ.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alt">النص البديل للصورة</Label>
                <Input id="alt" {...form.register("alt")} placeholder="وصف مختصر للصورة الرئيسية" />
                {form.formState.errors.alt && (
                  <p className="text-sm text-destructive">{form.formState.errors.alt.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  إذا تُرك فارغًا يُستخدم عنوان المنشور تلقائيًا.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select
                  onValueChange={(value) => form.setValue("category_id", Number(value), { shouldValidate: true })}
                  value={form.watch("category_id") ? String(form.watch("category_id")) : ""}
                  disabled={categoriesQuery.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={categoriesQuery.isLoading ? "جاري التحميل..." : "اختر التصنيف"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesQuery.data?.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category_id && (
                  <p className="text-sm text-destructive">{form.formState.errors.category_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select
                  onValueChange={(value) => form.setValue("status", Number(value), { shouldValidate: true })}
                  value={String(form.watch("status") ?? 1)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">منشور</SelectItem>
                    <SelectItem value="0">مسودة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3">
                <Checkbox
                  checked={!!form.watch("is_featured")}
                  onCheckedChange={(checked) => form.setValue("is_featured", checked === true)}
                />
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Star className="h-4 w-4 text-amber-500" />
                  منشور مميز
                </span>
              </label>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || isTitleDuplicate}>
                {createMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                حفظ المنشور
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                الصورة الرئيسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => form.setValue("image", event.target.files?.[0], { shouldDirty: true })}
              />
              {image && <p className="text-xs text-muted-foreground">{image.name}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                المرفقات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="file"
                multiple
                onChange={(event) =>
                  form.setValue("attachments", Array.from(event.target.files ?? []), { shouldDirty: true })
                }
              />
              {attachments.length > 0 && (
                <div className="space-y-1 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  {attachments.map((file) => (
                    <p key={`${file.name}-${file.size}`}>{file.name}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
