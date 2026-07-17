import type { Permission } from "@/lib/api/types";

export interface PermissionGroup {
  label: string;
  permissions: Permission[];
}

// Human labels for common permission category prefixes.
const CATEGORY_LABELS: Record<string, string> = {
  users: "المستخدمون",
  manage: "الإدارة العامة",
  roles: "الأدوار",
  articles: "المقالات",
  posts: "المنشورات",
  categories: "التصنيفات",
  comments: "التعليقات",
  files: "الملفات",
  settings: "الإعدادات",
  teacher: "المعلمون",
  dashboard: "لوحة التحكم",
  access: "الوصول",
};

// Derives a grouping key from a permission name. Supports both the
// space-separated Laravel style ("manage users") and the dotted style
// ("teacher.files.premium.download") — the first segment is the category.
function categoryOf(name: string): string {
  const trimmed = name.trim();
  const bySpace = trimmed.split(/\s+/)[0];
  const byDot = trimmed.split(".")[0];
  // Prefer the dotted namespace when present, else the leading word.
  return (trimmed.includes(".") ? byDot : bySpace).toLowerCase();
}

/**
 * Groups permissions by their leading category, sorted alphabetically within
 * each group and by group label. Keeps a stable, readable structure for the
 * role editor.
 */
export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const map = new Map<string, Permission[]>();
  for (const permission of permissions) {
    const key = categoryOf(permission.name) || "other";
    const list = map.get(key);
    if (list) list.push(permission);
    else map.set(key, [permission]);
  }

  return [...map.entries()]
    .map(([key, perms]) => ({
      label: CATEGORY_LABELS[key] ?? key,
      permissions: [...perms].sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "ar"));
}
