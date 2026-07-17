import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Archive, Edit, Eye, FileText, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { useCountry } from "@/hooks/use-country";
import { academicApi } from "@/lib/api/academic";
import { teacherSubscriptionAdminApi } from "@/lib/api/teacherSubscription";
import type { SchoolClass, Semester, Subject, TeacherPremiumFile } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UploadFormValues = {
  title: string;
  description: string;
  category: string;
  class_id: string;
  subject_id: string;
  semester_id: string;
  semester_name: string;
  file: FileList | null;
};

// Derive a human file-type label from a filename extension. Mirrors the backend's
// `normalizeFileType` so the auto-detected type shown here matches what is stored.
function detectFileType(filename?: string): string {
  if (!filename) return "";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ext || "file";
}

const categoryOptions = [
  { value: "exam", label: "امتحانات" },
  { value: "worksheet", label: "أوراق عمل" },
  { value: "summary", label: "ملخصات" },
  { value: "presentation", label: "عروض تقديمية" },
  { value: "plan", label: "خطط وتحضير" },
  { value: "other", label: "أخرى" },
];

function sortClasses(items: SchoolClass[] = []) {
  return [...items].sort(
    (a, b) => (a.grade_level ?? 0) - (b.grade_level ?? 0) || a.grade_name.localeCompare(b.grade_name, "ar"),
  );
}

function sortSubjects(items: Subject[] = []) {
  return [...items].sort((a, b) => a.subject_name.localeCompare(b.subject_name, "ar"));
}

function sortPremiumFiles(items: TeacherPremiumFile[] = []) {
  return [...items].sort((a, b) => {
    const gradeCompare = (a.grade_name || "").localeCompare(b.grade_name || "", "ar");
    if (gradeCompare !== 0) return gradeCompare;
    const subjectCompare = (a.subject_name || "").localeCompare(b.subject_name || "", "ar");
    if (subjectCompare !== 0) return subjectCompare;
    return (a.title || a.original_filename || "").localeCompare(b.title || b.original_filename || "", "ar");
  });
}

function categoryLabel(value?: string) {
  return categoryOptions.find((item) => item.value === value)?.label || value || "-";
}

export default function PremiumFiles() {
  const queryClient = useQueryClient();
  const country = useCountry();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["admin", "ts", "files"],
    queryFn: () => teacherSubscriptionAdminApi.listPremiumFiles(),
  });
  const { data: schoolClasses = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ["admin", "ts", "premium-files", "classes", country],
    queryFn: () => academicApi.listSchoolClasses(country),
  });

  const uploadForm = useForm<UploadFormValues>({
    defaultValues: {
      title: "",
      description: "",
      category: "exam",
      class_id: "",
      subject_id: "",
      semester_id: "",
      semester_name: "",
      file: null,
    },
  });

  const selectedClassId = uploadForm.watch("class_id");
  const selectedSubjectId = uploadForm.watch("subject_id");
  const watchedFile = uploadForm.watch("file");
  const detectedType = detectFileType(watchedFile?.[0]?.name);

  const sortedClasses = useMemo(() => sortClasses(schoolClasses), [schoolClasses]);
  const selectedClass = useMemo(
    () => sortedClasses.find((item) => String(item.id) === selectedClassId),
    [selectedClassId, sortedClasses],
  );
  const { data: subjects = [], isLoading: isSubjectsLoading } = useQuery({
    queryKey: ["admin", "ts", "premium-files", "subjects", country, selectedClassId],
    queryFn: () => academicApi.listSubjects(selectedClassId, country),
    enabled: Boolean(selectedClassId),
  });
  const sortedSubjects = useMemo(() => sortSubjects(subjects), [subjects]);

  // Semesters are tied to the selected subject (and its class) in the database.
  const { data: semestersResponse, isLoading: isSemestersLoading } = useQuery({
    queryKey: ["admin", "ts", "premium-files", "semesters", country, selectedSubjectId],
    queryFn: () => academicApi.listSemesters(selectedSubjectId, country),
    enabled: Boolean(selectedSubjectId),
  });
  const semesters: Semester[] = semestersResponse?.semesters ?? [];
  const sortedFiles = useMemo(() => sortPremiumFiles(files), [files]);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => teacherSubscriptionAdminApi.uploadPremiumFile(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ts", "files"] });
      toast({ title: "تم رفع الملف بنجاح" });
      setIsUploadOpen(false);
      uploadForm.reset();
    },
    onError: () => {
      toast({ title: "تعذر رفع الملف", variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => teacherSubscriptionAdminApi.archivePremiumFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ts", "files"] });
      toast({ title: "تمت أرشفة الملف" });
    },
  });

  const handleUpload = (values: UploadFormValues) => {
    const selectedSubject = sortedSubjects.find((item) => String(item.id) === values.subject_id);
    const uploadedFile = values.file?.[0];

    if (!selectedClass || !selectedSubject) {
      toast({ title: "الرجاء اختيار الصف والمادة من القوائم", variant: "destructive" });
      return;
    }
    if (!uploadedFile) {
      toast({ title: "الرجاء اختيار الملف", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("country", country);
    formData.append("title", values.title.trim() || uploadedFile.name);
    if (values.description.trim()) formData.append("description", values.description.trim());
    formData.append("category", values.category || "exam");
    formData.append("grade_level", String(selectedClass.grade_level || selectedClass.id));
    formData.append("grade_name", selectedClass.grade_name);
    formData.append("subject_id", String(selectedSubject.id));
    formData.append("subject_name", selectedSubject.subject_name);
    if (values.semester_id) formData.append("semester_id", values.semester_id);
    if (values.semester_name.trim()) formData.append("semester_name", values.semester_name.trim());
    // File type is auto-detected from the file's extension (backend also derives it).
    const fileType = detectFileType(uploadedFile.name);
    if (fileType) formData.append("file_type", fileType);
    formData.append("file", uploadedFile);

    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الملفات المميزة</h1>
          <p className="mt-1 text-muted-foreground">إدارة الملفات الحصرية وربطها بالصف والمادة حتى تظهر للمشتركين المطابقين.</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" /> إضافة ملف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>رفع ملف مميز جديد</DialogTitle>
            </DialogHeader>
            <Form {...uploadForm}>
              <form onSubmit={uploadForm.handleSubmit(handleUpload)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={uploadForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>العنوان</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="عنوان الملف" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={uploadForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>التصنيف</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر التصنيف" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={uploadForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف مختصر (اختياري)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="وصف يساعد المعلم على معرفة محتوى الملف" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={uploadForm.control}
                    name="class_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الصف</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            uploadForm.setValue("subject_id", "");
                            uploadForm.setValue("semester_id", "");
                            uploadForm.setValue("semester_name", "");
                          }}
                          disabled={isClassesLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isClassesLoading ? "جاري تحميل الصفوف..." : "اختر الصف"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sortedClasses.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.grade_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={uploadForm.control}
                    name="subject_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المادة</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            uploadForm.setValue("semester_id", "");
                            uploadForm.setValue("semester_name", "");
                          }}
                          disabled={!selectedClassId || isSubjectsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={!selectedClassId ? "اختر الصف أولا" : isSubjectsLoading ? "جاري تحميل المواد..." : "اختر المادة"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sortedSubjects.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.subject_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={uploadForm.control}
                    name="semester_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الفصل الدراسي</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            const picked = semesters.find((item) => String(item.id) === value);
                            uploadForm.setValue("semester_name", picked?.semester_name ?? "");
                          }}
                          disabled={!selectedSubjectId || isSemestersLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !selectedSubjectId
                                    ? "اختر المادة أولا"
                                    : isSemestersLoading
                                    ? "جاري تحميل الفصول..."
                                    : semesters.length === 0
                                    ? "لا توجد فصول لهذه المادة"
                                    : "اختر الفصل الدراسي"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {semesters.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.semester_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">نوع الملف (تلقائي)</label>
                    <Input
                      value={detectedType ? detectedType.toUpperCase() : ""}
                      readOnly
                      disabled
                      placeholder="يُكتشف تلقائيًا من الملف المرفق"
                    />
                  </div>
                </div>

                <FormField
                  control={uploadForm.control}
                  name="file"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>الملف</FormLabel>
                      <FormControl>
                        <Input type="file" onChange={(e) => onChange(e.target.files)} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? "جاري الرفع..." : "رفع الملف"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الملفات</CardTitle>
          <CardDescription>مرتبة حسب الصف ثم المادة لتسهيل متابعة الملفات التي تظهر للمشتركين.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الملف</TableHead>
                  <TableHead>الصف</TableHead>
                  <TableHead>المادة</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>مرات التنزيل</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : sortedFiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center">
                      لا توجد ملفات
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="ml-2 h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>{file.title || file.original_filename}</div>
                            {file.semester_name && <div className="text-xs text-muted-foreground">{file.semester_name}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{file.grade_name || "-"}</TableCell>
                      <TableCell>{file.subject_name || "-"}</TableCell>
                      <TableCell>{categoryLabel(file.category)}</TableCell>
                      <TableCell>{file.download_count}</TableCell>
                      <TableCell>
                        <Badge variant={file.is_active ? "default" : "secondary"}>{file.is_active ? "نشط" : "مؤرشف"}</Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild title="تفاصيل الملف">
                            <Link href={`/admin/teacher-subscriptions/premium-files/${file.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" title="تعديل">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {file.is_active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => archiveMutation.mutate(file.id)}
                              disabled={archiveMutation.isPending}
                              title="أرشفة"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
