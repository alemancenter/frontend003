export interface Role {
  id: number;
  name: string;
  guard_name: string;
  permissions?: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  phone?: string | null;
  job_title?: string | null;
  gender?: string | null;
  country?: string | null;
  bio?: string | null;
  social_links?: Record<string, string> | string | null;
  profile_photo_url?: string | null;
  profile_photo_path?: string | null;
  status: "active" | "inactive" | "banned";
  created_at: string;
  updated_at: string;
  last_activity?: string | null;
  last_seen?: string | null;
  roles?: Role[];
  permissions?: Permission[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token?: string;
  user?: User;
}

export interface SchoolClass {
  id: number;
  grade_name: string;
  grade_level: number;
  country_id?: number | null;
  created_at?: string;
  updated_at?: string;
  subjects?: Subject[];
  semesters?: Semester[];
}

export interface Subject {
  id: number;
  subject_name: string;
  /** FK to school_classes.id, despite the confusing name inherited from the backend. */
  grade_level: number;
  articles_count?: number;
  files_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Semester {
  id: number;
  semester_name: string;
  /** FK to school_classes.id, despite the confusing name inherited from the backend. */
  grade_level: number;
  created_at?: string;
  updated_at?: string;
}

export interface SemestersResponse {
  subject: Subject;
  class_id: number;
  semesters: Semester[];
}

export interface Keyword {
  id: number;
  keyword: string;
}

export interface FileItem {
  id: number;
  article_id?: number | null;
  post_id?: number | null;
  file_path?: string;
  /** Extension-ish type stored by the backend, e.g. "pdf", "doc". */
  file_type?: string;
  file_category?: string | null;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  view_count?: number;
  views_count?: number;
  views?: number;
  download_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  grade_level?: string | null;
  subject_id?: number | null;
  semester_id?: number | null;
  author_id?: number | null;
  meta_description?: string | null;
  status: number;
  visit_count: number;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  subject?: Subject | null;
  semester?: Semester | null;
  files?: FileItem[];
  keywords_rel?: Keyword[];
  comments?: Comment[];
}

export interface Category {
  id: number;
  name: string;
  slug?: string;
  parent_id?: number | null;
  /** Either a lucide icon name (e.g. "ActivitySquare") or a storage path. */
  icon?: string | null;
  /** Storage path of the cover image, e.g. "category_images/abc.png". */
  image?: string | null;
  /** Storage path of the icon image. */
  icon_image?: string | null;
  is_active?: boolean;
  country?: string;
  depth?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PostFile {
  id: number;
  post_id?: number;
  file_path?: string;
  file_type?: string;
  file_category?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  view_count?: number;
  download_count?: number;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  category_id?: number;
  status?: number;
  view_count?: number;
  views?: number;
  image?: string | null;
  image_url?: string | null;
  alt?: string | null;
  files?: PostFile[];
  created_at: string;
  updated_at: string;
}

export type CommentStatus = "pending" | "approved" | "rejected";

export interface Comment {
  id: number;
  body: string;
  user_id?: number;
  user?: User;
  status?: CommentStatus;
  /** Polymorphic target, e.g. "App\\Models\\Article" or "App\\Models\\Post". */
  commentable_type?: string;
  commentable_id?: number;
  /** Country code the comment belongs to (jo/sa/eg/ps). */
  database?: string;
  created_at: string;
  updated_at?: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string | null;
  /** Single event day, ISO date-time; the backend column is `event_date`. */
  event_date: string;
  created_at?: string;
  updated_at?: string;
}

// Internal team message (dashboard messaging). The backend boolean is `read`
// — not `read_at`.
export interface InternalMessage {
  id: number;
  conversation_id?: number;
  sender_id?: number;
  subject: string;
  body: string;
  read?: boolean;
  is_important?: boolean;
  is_draft?: boolean;
  created_at: string;
  sender?: User | null;
  recipient?: User | null;
}

// Message submitted through the public contact form. The backend boolean is
// `read` — not `is_read`.
export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  page_url?: string;
  read?: boolean;
  created_at: string;
}

// A stored notification. The human-facing title/message live inside `data`;
// the top-level `read_at` (nullable) marks whether it was read.
export interface AppNotification {
  id: string;
  type: string;
  notifiable_id?: number;
  data: {
    title?: string;
    message?: string;
    action_url?: string;
    [key: string]: unknown;
  };
  read_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface LatestNotifications {
  notifications: AppNotification[];
  unread_count: number;
}

export interface PaginatedResponse<T> {
  items?: T[];
  data?: T[];
  total?: number;
  current_page?: number;
  per_page?: number;
  last_page?: number;
}

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string;
  target_audience: string;
  price_jod: number;
  currency: string;
  duration_days: number;
  device_limit: number;
  download_limit: number;
  ai_generation_limit: number;
  export_limit: number;
  features_json?: string;
  is_active: boolean;
}

export interface TeacherSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  status: "active" | "expired" | "cancelled" | "pending";
  starts_at: string;
  ends_at: string;
  price_jod: number;
  device_limit: number;
  download_limit: number;
  ai_generation_limit: number;
  export_limit: number;
  plan?: SubscriptionPlan;
  user?: User;
  /** The teacher's profile — what they actually subscribed for (subjects, school, city). */
  profile?: TeacherProfile | null;
}

export interface TeacherProfile {
  id: number;
  user_id: number;
  subject?: string;
  /** JSON array string of up to 3 subjects, e.g. '["رياضيات","علوم"]'. */
  subjects?: string;
  school?: string;
  phone?: string;
  city?: string;
}

export interface SubscriptionOrder {
  id: number;
  user_id: number;
  plan_id: number;
  status: "pending" | "approved" | "rejected";
  amount_jod: number;
  currency: string;
  payment_method: string;
  payer_name: string;
  phone: string;
  payment_reference?: string;
  payment_proof_url?: string;
  admin_note?: string;
  reviewed_at?: string | null;
  created_at: string;
  plan?: SubscriptionPlan;
  user?: User;
}

export interface TeacherDevice {
  id: number;
  user_id: number;
  device_hash: string;
  label?: string;
  is_active: boolean;
  last_seen_at?: string | null;
  created_at: string;
}

export interface TeacherPremiumFile {
  id: number;
  title: string;
  description?: string;
  country: string;
  grade_name?: string;
  subject_name: string;
  semester_name?: string;
  category: string;
  original_filename: string;
  file_size: number;
  mime_type?: string;
  file_type?: string;
  is_active: boolean;
  download_count: number;
  requires_teacher_subscription: boolean;
  created_at: string;
}

export interface TeacherLibraryItem {
  id: number;
  user_id: number;
  item_type: string;
  item_id?: number;
  title: string;
  source_type: string;
  category?: string;
  created_at: string;
}

export interface TeacherAIGeneration {
  id: number;
  user_id: number;
  subscription_id: number;
  tool_type: string;
  title?: string;
  model?: string;
  prompt: string;
  output: string;
  export_count: number;
  created_at: string;
}

// Audit trail for sensitive teacher-subscription admin/member actions.
export interface TeacherAuditLog {
  id: number;
  actor_id?: number | null;
  user_id?: number | null;
  entity_type: string;
  entity_id: number;
  action: string;
  note?: string;
  ip_hash?: string;
  created_at: string;
  actor?: User | null;
  user?: User | null;
}

export interface Notification {
  id: number;
  title?: string;
  body?: string;
  read_at?: string | null;
  created_at: string;
}
