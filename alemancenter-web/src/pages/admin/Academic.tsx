import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAcademicApi } from "@/lib/api/admin";
import type { SchoolClass, Semester, Subject } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRY_META, VALID_COUNTRIES, type CountryCode } from "@/lib/country";
import { useCountry, useCountrySwitcher } from "@/contexts/CountryContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  BookOpen,
  CalendarRange,
  Edit,
  FileText,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

const ALL_CLASSES = "all";

const classSchema = z.object({
  grade_name: z.string().min(1, "الاسم مطلوب"),
  grade_level: z.coerce.number().optional(),
});

// NOTE: `grade_level` on subjects/semesters is a FK to school_classes.id —
// the column name is inherited from the legacy schema, it is NOT the class's
// own grade_level ordering number.
const subjectSchema = z.object({
  subject_name: z.string().min(1, "الاسم مطلوب"),
  grade_level: z.number({ error: "الصف مطلوب" }).int().positive("الصف مطلوب"),
});

const semesterSchema = z.object({
  semester_name: z.string().min(1, "الاسم مطلوب"),
  grade_level: z.number({ error: "الصف مطلوب" }).int().positive("الصف مطلوب"),
});

type AcademicTab = "classes" | "subjects" | "semesters";
type AcademicItem = SchoolClass | Subject | Semester;

const TAB_META: Record<AcademicTab, { singular: string; plural: string; description: string }> = {
  classes: {
    singular: "صف",
    plural: "الصفوف الدراسية",
    description: "الصفوف هي جذر النظام — كل مبحث وفصل يرتبط بصف.",
  },
  subjects: {
    singular: "مبحث",
    plural: "المباحث والمواد",
    description: "المباحث المرتبطة بكل صف، مع عدد المقالات والملفات في كل مبحث.",
  },
  semesters: {
    singular: "فصل",
    plural: "الفصول الدراسية",
    description: "الفصول الدراسية المرتبطة بكل صف.",
  },
};

interface AcademicProps {
  initialTab?: AcademicTab;
  title?: string;
  description?: string;
}

export default function Academic({
  initialTab = "classes",
  title = "النظام الأكاديمي",
  description = "إدارة الصفوف، المباحث، والفصول الدراسية",
}: AcademicProps) {
  const queryClient = useQueryClient();
  const country = useCountry();
  const switchCountry = useCountrySwitcher();

  const [activeTab, setActiveTab] = useState<AcademicTab>(initialTab);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AcademicItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ item: AcademicItem; tab: AcademicTab } | null>(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>(ALL_CLASSES);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Filters are per-tab concepts; reset them when switching tabs.
  useEffect(() => {
    setSearch("");
    setClassFilter(ALL_CLASSES);
  }, [activeTab, country]);

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["admin", "academic", "classes", country],
    queryFn: () => adminAcademicApi.listClasses({ country }),
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["admin", "academic", "subjects", country],
    queryFn: () => adminAcademicApi.listSubjects({ country }),
  });

  const { data: semesters = [], isLoading: semestersLoading } = useQuery({
    queryKey: ["admin", "academic", "semesters", country],
    queryFn: () => adminAcademicApi.listSemesters({ country }),
  });

  const classForm = useForm<z.input<typeof classSchema>, unknown, z.output<typeof classSchema>>({
    resolver: zodResolver(classSchema),
    defaultValues: { grade_name: "", grade_level: undefined },
  });

  const subjectForm = useForm<z.input<typeof subjectSchema>, unknown, z.output<typeof subjectSchema>>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { subject_name: "", grade_level: undefined },
  });

  const semesterForm = useForm<z.input<typeof semesterSchema>, unknown, z.output<typeof semesterSchema>>({
    resolver: zodResolver(semesterSchema),
    defaultValues: { semester_name: "", grade_level: undefined },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "academic"] });
    // The public site and the article editors read the same academic tree.
    queryClient.invalidateQueries({ queryKey: ["academic"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    classForm.reset({ grade_name: "", grade_level: undefined });
    subjectForm.reset({ subject_name: "", grade_level: undefined });
    semesterForm.reset({ semester_name: "", grade_level: undefined });
  };

  const mutationOptions = (successMessage: string, failureMessage: string) => ({
    onSuccess: () => {
      invalidate();
      toast.success(successMessage);
      closeDialog();
    },
    onError: (error: Error) => toast.error(failureMessage, { description: error.message }),
  });

  const createClassMutation = useMutation({
    mutationFn: (data: z.output<typeof classSchema>) => adminAcademicApi.createClass(data, { country }),
    ...mutationOptions("تم إضافة الصف", "فشل إضافة الصف"),
  });
  const updateClassMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.output<typeof classSchema> }) =>
      adminAcademicApi.updateClass(id, data, { country }),
    ...mutationOptions("تم تحديث الصف", "فشل تحديث الصف"),
  });
  const createSubjectMutation = useMutation({
    mutationFn: (data: z.output<typeof subjectSchema>) => adminAcademicApi.createSubject(data, { country }),
    ...mutationOptions("تم إضافة المبحث", "فشل إضافة المبحث"),
  });
  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.output<typeof subjectSchema> }) =>
      adminAcademicApi.updateSubject(id, data, { country }),
    ...mutationOptions("تم تحديث المبحث", "فشل تحديث المبحث"),
  });
  const createSemesterMutation = useMutation({
    mutationFn: (data: z.output<typeof semesterSchema>) => adminAcademicApi.createSemester(data, { country }),
    ...mutationOptions("تم إضافة الفصل", "فشل إضافة الفصل"),
  });
  const updateSemesterMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.output<typeof semesterSchema> }) =>
      adminAcademicApi.updateSemester(id, data, { country }),
    ...mutationOptions("تم تحديث الفصل", "فشل تحديث الفصل"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ item, tab }: { item: AcademicItem; tab: AcademicTab }) => {
      if (tab === "classes") return adminAcademicApi.deleteClass(item.id, { country });
      if (tab === "subjects") return adminAcademicApi.deleteSubject(item.id, { country });
      return adminAcademicApi.deleteSemester(item.id, { country });
    },
    onSuccess: () => {
      invalidate();
      toast.success("تم الحذف بنجاح");
      setDeleteTarget(null);
    },
    onError: (error: Error) => toast.error("فشل الحذف", { description: error.message }),
  });

  const isSaving =
    createClassMutation.isPending ||
    updateClassMutation.isPending ||
    createSubjectMutation.isPending ||
    updateSubjectMutation.isPending ||
    createSemesterMutation.isPending ||
    updateSemesterMutation.isPending;

  const openDialog = (item: AcademicItem | null = null) => {
    setEditingItem(item);
    if (activeTab === "classes") {
      const value = item as SchoolClass | null;
      classForm.reset({
        grade_name: value?.grade_name ?? "",
        grade_level: value?.grade_level,
      });
    } else if (activeTab === "subjects") {
      const value = item as Subject | null;
      subjectForm.reset({
        subject_name: value?.subject_name ?? "",
        grade_level: value?.grade_level,
      });
    } else {
      const value = item as Semester | null;
      semesterForm.reset({
        semester_name: value?.semester_name ?? "",
        grade_level: value?.grade_level,
      });
    }
    setIsDialogOpen(true);
  };

  const submitClass = (data: z.output<typeof classSchema>) => {
    if (editingItem) updateClassMutation.mutate({ id: editingItem.id, data });
    else createClassMutation.mutate(data);
  };
  const submitSubject = (data: z.output<typeof subjectSchema>) => {
    if (editingItem) updateSubjectMutation.mutate({ id: editingItem.id, data });
    else createSubjectMutation.mutate(data);
  };
  const submitSemester = (data: z.output<typeof semesterSchema>) => {
    if (editingItem) updateSemesterMutation.mutate({ id: editingItem.id, data });
    else createSemesterMutation.mutate(data);
  };

  // Subjects/semesters reference their class by school_classes.id.
  const classNameById = useMemo(
    () => new Map(classes.map((item) => [item.id, item.grade_name])),
    [classes],
  );
  const className = (classId: number) => classNameById.get(classId) ?? `#${classId}`;

  const term = search.trim().toLowerCase();
  const matchesClass = (classId: number) =>
    classFilter === ALL_CLASSES || String(classId) === classFilter;

  const filteredClasses = useMemo(
    () => classes.filter((item) => item.grade_name.toLowerCase().includes(term)),
    [classes, term],
  );
  const filteredSubjects = useMemo(
    () =>
      subjects.filter(
        (item) => item.subject_name.toLowerCase().includes(term) && matchesClass(item.grade_level),
      ),
    [subjects, term, classFilter],
  );
  const filteredSemesters = useMemo(
    () =>
      semesters.filter(
        (item) => item.semester_name.toLowerCase().includes(term) && matchesClass(item.grade_level),
      ),
    [semesters, term, classFilter],
  );

  // Counts per class, so the classes tab shows how much hangs off each row.
  const subjectCountByClass = useMemo(() => {
    const counts = new Map<number, number>();
    subjects.forEach((item) => counts.set(item.grade_level, (counts.get(item.grade_level) ?? 0) + 1));
    return counts;
  }, [subjects]);

  const semesterCountByClass = useMemo(() => {
    const counts = new Map<number, number>();
    semesters.forEach((item) => counts.set(item.grade_level, (counts.get(item.grade_level) ?? 0) + 1));
    return counts;
  }, [semesters]);

  const deleteWarning = () => {
    if (!deleteTarget) return "";
    if (deleteTarget.tab === "classes") {
      const id = deleteTarget.item.id;
      const linked = (subjectCountByClass.get(id) ?? 0) + (semesterCountByClass.get(id) ?? 0);
      return linked > 0
        ? `يرتبط بهذا الصف ${linked} عنصر (مباحث/فصول) قد تصبح بلا صف. لا يمكن التراجع.`
        : "لا يمكن التراجع عن هذا الإجراء.";
    }
    return "لا يمكن التراجع عن هذا الإجراء.";
  };

  const ActionCell = ({ item, tab }: { item: AcademicItem; tab: AcademicTab }) => (
    <TableCell className="text-left">
      <div className="flex items-center justify-end gap-1">
        <Button size="icon" variant="ghost" title="تعديل" onClick={() => openDialog(item)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          title="حذف"
          onClick={() => setDeleteTarget({ item, tab })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </TableCell>
  );

  const EmptyRow = ({ colSpan }: { colSpan: number }) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
        {term || classFilter !== ALL_CLASSES ? "لا توجد نتائج مطابقة للفلاتر" : "لا توجد عناصر بعد"}
      </TableCell>
    </TableRow>
  );

  const LoadingRow = ({ colSpan }: { colSpan: number }) => (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </TableCell>
    </TableRow>
  );

  const meta = TAB_META[activeTab];

  const FiltersBar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <CardTitle>{meta.plural}</CardTitle>
        <CardDescription>{meta.description}</CardDescription>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-56">
          <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم..."
            className="pr-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {activeTab !== "classes" && (
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLASSES}>كل الصفوف</SelectItem>
              {classes.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.grade_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" onClick={() => openDialog()} disabled={activeTab !== "classes" && classes.length === 0}>
          <Plus className="ml-2 h-4 w-4" />
          {meta.singular} جديد
        </Button>
      </div>
    </div>
  );

  const ParentClassWarning =
    activeTab !== "classes" && classes.length === 0 && !classesLoading ? (
      <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
        أنشئ صفًا دراسيًا أولًا — كل مبحث أو فصل يجب أن يرتبط بصف.
      </p>
    ) : null;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
        <Select value={country} onValueChange={(value) => switchCountry(value as CountryCode)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="قاعدة البيانات" />
          </SelectTrigger>
          <SelectContent>
            {VALID_COUNTRIES.map((code) => (
              <SelectItem key={code} value={code}>
                {COUNTRY_META[code].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AcademicTab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            الصفوف
            <span className="rounded-full bg-background px-1.5 text-xs font-bold text-foreground shadow-sm">
              {classes.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2">
            <BookOpen className="h-4 w-4" />
            المباحث
            <span className="rounded-full bg-background px-1.5 text-xs font-bold text-foreground shadow-sm">
              {subjects.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="semesters" className="gap-2">
            <CalendarRange className="h-4 w-4" />
            الفصول
            <span className="rounded-full bg-background px-1.5 text-xs font-bold text-foreground shadow-sm">
              {semesters.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-0">
          <Card>
            <CardHeader className="gap-4">{FiltersBar}</CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">المعرف</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead className="w-[90px]">الترتيب</TableHead>
                      <TableHead className="w-[110px]">المباحث</TableHead>
                      <TableHead className="w-[110px]">الفصول</TableHead>
                      <TableHead className="w-[110px] text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classesLoading ? (
                      <LoadingRow colSpan={6} />
                    ) : filteredClasses.length === 0 ? (
                      <EmptyRow colSpan={6} />
                    ) : (
                      filteredClasses.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell className="font-medium">{item.grade_name}</TableCell>
                          <TableCell className="text-muted-foreground">{item.grade_level ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <BookOpen className="h-3 w-3" />
                              {subjectCountByClass.get(item.id) ?? 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <CalendarRange className="h-3 w-3" />
                              {semesterCountByClass.get(item.id) ?? 0}
                            </Badge>
                          </TableCell>
                          <ActionCell item={item} tab="classes" />
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="mt-0">
          <Card>
            <CardHeader className="gap-4">
              {FiltersBar}
              {ParentClassWarning}
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">المعرف</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الصف المرتبط</TableHead>
                      <TableHead className="w-[110px]">المقالات</TableHead>
                      <TableHead className="w-[110px]">الملفات</TableHead>
                      <TableHead className="w-[110px] text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectsLoading ? (
                      <LoadingRow colSpan={6} />
                    ) : filteredSubjects.length === 0 ? (
                      <EmptyRow colSpan={6} />
                    ) : (
                      filteredSubjects.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell className="font-medium">{item.subject_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {className(item.grade_level)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {(item.articles_count ?? 0).toLocaleString("ar-EG")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {(item.files_count ?? 0).toLocaleString("ar-EG")}
                            </span>
                          </TableCell>
                          <ActionCell item={item} tab="subjects" />
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="semesters" className="mt-0">
          <Card>
            <CardHeader className="gap-4">
              {FiltersBar}
              {ParentClassWarning}
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">المعرف</TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الصف المرتبط</TableHead>
                      <TableHead className="w-[110px] text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {semestersLoading ? (
                      <LoadingRow colSpan={4} />
                    ) : filteredSemesters.length === 0 ? (
                      <EmptyRow colSpan={4} />
                    ) : (
                      filteredSemesters.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell className="font-medium">{item.semester_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {className(item.grade_level)}
                            </Badge>
                          </TableCell>
                          <ActionCell item={item} tab="semesters" />
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}>
        <DialogContent dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>
              {editingItem ? "تعديل" : "إضافة"} {meta.singular}
            </DialogTitle>
            <DialogDescription>
              في قاعدة بيانات {COUNTRY_META[country as CountryCode]?.name}
            </DialogDescription>
          </DialogHeader>

          {activeTab === "classes" && (
            <Form {...classForm}>
              <form onSubmit={classForm.handleSubmit(submitClass)} className="space-y-4">
                <FormField
                  control={classForm.control}
                  name="grade_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: الصف الأول الابتدائي" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={classForm.control}
                  name="grade_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الترتيب (اختياري)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="ترتيب ظهور الصف"
                          {...field}
                          value={(field.value as number | string | undefined) ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="gap-2 sm:justify-start">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    حفظ
                  </Button>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    إلغاء
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {activeTab === "subjects" && (
            <Form {...subjectForm}>
              <form onSubmit={subjectForm.handleSubmit(submitSubject)} className="space-y-4">
                <FormField
                  control={subjectForm.control}
                  name="subject_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: الرياضيات" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={subjectForm.control}
                  name="grade_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الصف المرتبط</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الصف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.grade_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="gap-2 sm:justify-start">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    حفظ
                  </Button>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    إلغاء
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {activeTab === "semesters" && (
            <Form {...semesterForm}>
              <form onSubmit={semesterForm.handleSubmit(submitSemester)} className="space-y-4">
                <FormField
                  control={semesterForm.control}
                  name="semester_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم</FormLabel>
                      <FormControl>
                        <Input placeholder="مثال: الفصل الأول" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={semesterForm.control}
                  name="grade_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الصف المرتبط</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الصف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.grade_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="gap-2 sm:justify-start">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    حفظ
                  </Button>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    إلغاء
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>{deleteWarning()}</AlertDialogDescription>
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
