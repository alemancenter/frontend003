import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { adminPostsApi, adminCategoriesApi, adminAiApi } from "@/lib/api/admin";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Sparkles, ArrowRight, Eye } from "lucide-react";

const postSchema = z.object({
  title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل"),
  content: z.string().min(10, "المحتوى يجب أن يكون 10 أحرف على الأقل"),
  // Plain number (not z.coerce): the Select always hands us a real number,
  // and coercion widens the form's input type to `unknown`.
  category_id: z.number().optional().nullable().transform(val => val || undefined),
  status: z.number().default(0),
});

// The schema coerces/defaults, so the values the fields hold (input) differ
// from what the resolver hands to onSubmit (output).
type PostFormInput = z.input<typeof postSchema>;
type PostFormValues = z.output<typeof postSchema>;

function postStatusValue(post: any): number {
  if (typeof post?.is_active === "boolean") return post.is_active ? 1 : 0;
  if (post?.status !== undefined && post?.status !== null) return Number(post.status) === 1 ? 1 : 0;
  return 0;
}

export default function EditPost() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const country = useCountry();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories", "list", country],
    queryFn: () => adminCategoriesApi.list({ country }),
  });

  const { data: post, isLoading } = useQuery({
    queryKey: ["admin", "posts", "show", country, id],
    queryFn: async () => {
      const posts = await adminPostsApi.list({ country });
      return posts.find((p: any) => p.id.toString() === id);
    },
    enabled: !!id,
  });

  const form = useForm<PostFormInput, unknown, PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { title: "", content: "", status: 0 },
  });

  useEffect(() => {
    if (post) {
      form.reset({
        title: post.title,
        content: post.content,
        category_id: post.category_id,
        status: postStatusValue(post),
      });
    }
  }, [post, form]);

  const updateMutation = useMutation({
    mutationFn: (values: PostFormValues) =>
      adminPostsApi.update(
        id,
        {
          title: values.title,
          content: values.content,
          category_id: values.category_id,
          is_active: values.status === 1,
        },
        { country },
      ),
    onSuccess: () => {
      toast({ title: "تم تحديث المنشور بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["admin", "posts"] });
    },
    onError: (error: any) => {
      toast({ title: "فشل تحديث المنشور", description: error.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: () => adminPostsApi.toggleStatus(id, { country }),
    onSuccess: () => {
      toast({ title: "تم تغيير حالة المنشور" });
      queryClient.invalidateQueries({ queryKey: ["admin", "posts", "show", id] });
    },
  });

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
        content_type: "post",
        category_id: form.getValues("category_id") || undefined,
      });
      const poll = setInterval(async () => {
        try {
          const status = await adminAiApi.status(job_id);
          if (status.status === "done") {
            clearInterval(poll);
            form.setValue("content", status.content_html || status.content || "");
            setIsGenerating(false);
            toast({ title: "تم توليد المحتوى بنجاح" });
          } else if (status.status === "failed") {
            clearInterval(poll);
            setIsGenerating(false);
            toast({ title: "فشل توليد المحتوى", description: status.error, variant: "destructive" });
          }
        } catch (e) {
          clearInterval(poll);
          setIsGenerating(false);
        }
      }, 3000);
    } catch (error: any) {
      setIsGenerating(false);
      toast({ title: "خطأ في خدمة الذكاء الاصطناعي", description: error.message, variant: "destructive" });
    }
  };

  const onSubmit = (values: PostFormValues) => updateMutation.mutate(values);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/admin/posts")}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">تعديل المنشور</h1>
            <p className="text-muted-foreground mt-1">تعديل بيانات المنشور: {post?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminCountrySelect />
          <Button variant="outline" onClick={() => toggleStatusMutation.mutate()} disabled={toggleStatusMutation.isPending}>
            {postStatusValue(post) === 1 ? "إخفاء" : "نشر"}
          </Button>
          <Button variant="ghost" size="icon" title="عرض المنشور" asChild>
            <a href={`/posts/${id}`} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>محتوى المنشور</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">العنوان</Label>
                  <Input id="title" {...form.register("title")} />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label>المحتوى</Label>
                    <Button type="button" variant="outline" size="sm" onClick={generateAI} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4 text-primary" />}
                      إعادة توليد بالذكاء الاصطناعي
                    </Button>
                  </div>
                  <RichTextEditor
                    value={form.watch("content")}
                    onChange={(html) => form.setValue("content", html, { shouldValidate: true })}
                    placeholder="اكتب محتوى المنشور هنا..."
                    minHeight="300px"
                    error={!!form.formState.errors.content}
                  />
                  {form.formState.errors.content && (
                    <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>التصنيف والإعدادات</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>القسم</Label>
                  <Select onValueChange={(val) => form.setValue("category_id", parseInt(val))} value={form.watch("category_id")?.toString() || ""}>
                    <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select onValueChange={(val) => form.setValue("status", parseInt(val))} value={String(form.watch("status") ?? 0)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">مسودة</SelectItem>
                      <SelectItem value="1">منشور</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
                  حفظ التعديلات
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
