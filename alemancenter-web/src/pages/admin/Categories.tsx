import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCategoriesApi, type CategoryInput } from "@/lib/api/admin";
import type { Category } from "@/lib/api/types";
import { imgUrl } from "@/lib/img-url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AdminCountrySelect } from "@/components/admin/AdminCountrySelect";
import { useCountry } from "@/contexts/CountryContext";
import {
  CornerDownLeft,
  Edit,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

const NO_PARENT = "none";

// Auto-slug: Arabic-friendly — keep letters/numbers, collapse the rest to "-".
// The backend generates one too when slug is empty; this just previews it.
function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

interface CategoryFormState {
  name: string;
  slug: string;
  icon: string;
  parent_id: string;
  is_active: boolean;
}

const EMPTY_FORM: CategoryFormState = {
  name: "",
  slug: "",
  icon: "",
  parent_id: NO_PARENT,
  is_active: true,
};

export default function Categories() {
  const country = useCountry();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [imageTarget, setImageTarget] = useState<Category | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin", "categories", "list", country],
    queryFn: () => adminCategoriesApi.list({ country }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const nameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(term) ||
        (category.slug ?? "").toLowerCase().includes(term),
    );
  }, [categories, query]);

  // ── mutations ─────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (input: CategoryInput) =>
      editing
        ? adminCategoriesApi.update(editing.id, input, { country })
        : adminCategoriesApi.create(input, { country }),
    onSuccess: () => {
      toast({ title: editing ? "تم تحديث التصنيف" : "تم إنشاء التصنيف" });
      setIsFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (error: Error) => {
      toast({
        title: editing ? "فشل تحديث التصنيف" : "فشل إنشاء التصنيف",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (category: Category) => adminCategoriesApi.toggleStatus(category.id, { country }),
    onSuccess: (_data, category) => {
      toast({ title: category.is_active ? "تم إخفاء التصنيف" : "تم تفعيل التصنيف" });
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: "فشل تغيير الحالة", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (category: Category) => adminCategoriesApi.delete(category.id, { country }),
    onSuccess: () => {
      toast({ title: "تم حذف التصنيف" });
      setDeleteTarget(null);
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: "فشل حذف التصنيف", description: error.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (category: Category) => {
      const payload = new FormData();
      if (coverFile) payload.append("image", coverFile);
      if (iconFile) payload.append("icon_image", iconFile);
      return adminCategoriesApi.uploadImages(category.id, payload, { country });
    },
    onSuccess: () => {
      toast({ title: "تم رفع الصور بنجاح" });
      setImageTarget(null);
      setCoverFile(null);
      setIconFile(null);
      invalidate();
    },
    onError: (error: Error) => {
      toast({ title: "فشل رفع الصور", description: error.message, variant: "destructive" });
    },
  });

  // ── handlers ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug ?? "",
      icon: category.icon ?? "",
      parent_id: category.parent_id ? String(category.parent_id) : NO_PARENT,
      is_active: category.is_active ?? true,
    });
    setIsFormOpen(true);
  };

  const submitForm = () => {
    const name = form.name.trim();
    if (name.length < 2) {
      toast({ title: "الاسم مطلوب", description: "اسم التصنيف حرفان على الأقل.", variant: "destructive" });
      return;
    }

    const parentId = form.parent_id === NO_PARENT ? null : Number(form.parent_id);

    saveMutation.mutate({
      name,
      slug: form.slug.trim() || slugify(name),
      icon: form.icon.trim() || undefined,
      parent_id: parentId,
      is_active: form.is_active,
      // Top-level categories are depth 0; a child sits one level below its parent.
      depth: parentId ? (categories.find((c) => c.id === parentId)?.depth ?? 0) + 1 : 0,
    });
  };

  // A category can't be its own parent (nor can we offer it as one while editing).
  const parentOptions = categories.filter((category) => category.id !== editing?.id);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">التصنيفات</h1>
          <p className="mt-1 text-muted-foreground">إدارة تصنيفات المنشورات: الإنشاء والتعديل والصور والحالة</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreate}>
            <Plus className="ml-2 h-4 w-4" />
            تصنيف جديد
          </Button>
          <AdminCountrySelect />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              قائمة التصنيفات
              <span className="ms-2 text-sm font-normal text-muted-foreground">
                ({filtered.length} من {categories.length})
              </span>
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الرابط..."
                className="pr-8"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
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
                  <TableHead className="w-[70px]">الصورة</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الرابط</TableHead>
                  <TableHead>التصنيف الأب</TableHead>
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
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {query ? "لا توجد نتائج مطابقة للبحث" : "لا توجد تصنيفات بعد — أنشئ أول تصنيف"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((category) => {
                    const thumb = imgUrl(category.image ?? category.icon_image, 64);
                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.id}</TableCell>
                        <TableCell>
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={category.name}
                              className="h-10 w-10 rounded-md border object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell dir="ltr" className="max-w-[200px] truncate text-start text-muted-foreground">
                          {category.slug || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {category.parent_id ? (
                            <span className="flex items-center gap-1">
                              <CornerDownLeft className="h-3.5 w-3.5" />
                              {nameById.get(category.parent_id) ?? `#${category.parent_id}`}
                            </span>
                          ) : (
                            <Badge variant="outline">رئيسي</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => toggleMutation.mutate(category)}
                            disabled={toggleMutation.isPending}
                            title="اضغط لتغيير الحالة"
                          >
                            <Badge
                              variant={category.is_active ? "default" : "secondary"}
                              className="cursor-pointer"
                            >
                              {category.is_active ? "مفعّل" : "مخفي"}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="رفع صورة / أيقونة"
                              onClick={() => {
                                setImageTarget(category);
                                setCoverFile(null);
                                setIconFile(null);
                              }}
                            >
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEdit(category)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              title="حذف"
                              onClick={() => setDeleteTarget(category)}
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

      {/* ── Create / edit dialog ────────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>{editing ? "تعديل التصنيف" : "تصنيف جديد"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "عدّل بيانات التصنيف ثم احفظ التغييرات."
                : "أنشئ تصنيفًا جديدًا في قاعدة البيانات الحالية."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">الاسم</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="مثلاً: قسم الإذاعة المدرسية"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-slug">الرابط (Slug)</Label>
              <Input
                id="category-slug"
                dir="ltr"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder={form.name ? slugify(form.name) : "يُولَّد تلقائيًا من الاسم"}
              />
              <p className="text-xs text-muted-foreground">إذا تُرك فارغًا يُولَّد تلقائيًا من الاسم.</p>
            </div>

            <div className="space-y-2">
              <Label>التصنيف الأب</Label>
              <Select
                value={form.parent_id}
                onValueChange={(value) => setForm((prev) => ({ ...prev, parent_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>بدون (تصنيف رئيسي)</SelectItem>
                  {parentOptions.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-icon">الأيقونة (اختياري)</Label>
              <Input
                id="category-icon"
                dir="ltr"
                value={form.icon}
                onChange={(event) => setForm((prev) => ({ ...prev, icon: event.target.value }))}
                placeholder="اسم أيقونة Lucide، مثل: BookOpen"
              />
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">تفعيل التصنيف</p>
                <p className="text-xs text-muted-foreground">التصنيف المخفي لا يظهر للزوار.</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              />
            </label>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={submitForm} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              {editing ? "حفظ التغييرات" : "إنشاء التصنيف"}
            </Button>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Image upload dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!imageTarget} onOpenChange={(open) => !open && setImageTarget(null)}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle>صور التصنيف</DialogTitle>
            <DialogDescription>{imageTarget?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cover-image">صورة الغلاف</Label>
              {imageTarget?.image && !coverFile && (
                <img
                  src={imgUrl(imageTarget.image, 320) ?? undefined}
                  alt="الغلاف الحالي"
                  className="h-28 w-full rounded-md border object-cover"
                />
              )}
              <Input
                id="cover-image"
                type="file"
                accept="image/*"
                onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon-image">صورة الأيقونة</Label>
              {imageTarget?.icon_image && !iconFile && (
                <img
                  src={imgUrl(imageTarget.icon_image, 96) ?? undefined}
                  alt="الأيقونة الحالية"
                  className="h-16 w-16 rounded-md border object-cover"
                />
              )}
              <Input
                id="icon-image"
                type="file"
                accept="image/*"
                onChange={(event) => setIconFile(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              onClick={() => imageTarget && uploadMutation.mutate(imageTarget)}
              disabled={uploadMutation.isPending || (!coverFile && !iconFile)}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="ml-2 h-4 w-4" />
              )}
              رفع
            </Button>
            <Button variant="outline" onClick={() => setImageTarget(null)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ─────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف التصنيف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleteTarget?.name}» نهائيًا. المنشورات المرتبطة به قد تفقد تصنيفها. لا يمكن التراجع عن هذا الإجراء.
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
