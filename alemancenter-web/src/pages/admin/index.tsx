import { lazy, Suspense } from "react";
import { Redirect, Switch, Route, useLocation } from "wouter";
import { RequireAdmin } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const Articles = lazy(() => import("@/pages/admin/articles"));
const CreateArticle = lazy(() => import("@/pages/admin/articles/Create"));
const EditArticle = lazy(() => import("@/pages/admin/articles/Edit"));
const Users = lazy(() => import("@/pages/admin/users"));
const UserDetail = lazy(() => import("@/pages/admin/users/UserDetail"));
const Categories = lazy(() => import("@/pages/admin/Categories"));
const Roles = lazy(() => import("@/pages/admin/Roles"));
const Permissions = lazy(() => import("@/pages/admin/Permissions"));
const Security = lazy(() => import("@/pages/admin/security"));
const SecurityLogs = lazy(() => import("@/pages/admin/security/Logs"));
const BlockedIps = lazy(() => import("@/pages/admin/security/BlockedIps"));
const TeacherSubscriptions = lazy(() => import("@/pages/admin/teacher-subscriptions"));
const SubscriptionOrders = lazy(() => import("@/pages/admin/teacher-subscriptions/Orders"));
const SubscriptionOrderDetail = lazy(() => import("@/pages/admin/teacher-subscriptions/OrderDetail"));
const SubscriptionsList = lazy(() => import("@/pages/admin/teacher-subscriptions/Subscriptions"));
const TeachersDirectory = lazy(() => import("@/pages/admin/teacher-subscriptions/Teachers"));
const TeacherDetail = lazy(() => import("@/pages/admin/teacher-subscriptions/TeacherDetail"));
const DevicesList = lazy(() => import("@/pages/admin/teacher-subscriptions/Devices"));
const DownloadsAudit = lazy(() => import("@/pages/admin/teacher-subscriptions/Downloads"));
const PremiumFiles = lazy(() => import("@/pages/admin/teacher-subscriptions/PremiumFiles"));
const PremiumFileDetail = lazy(() => import("@/pages/admin/teacher-subscriptions/PremiumFileDetail"));
const TSReports = lazy(() => import("@/pages/admin/teacher-subscriptions/Reports"));
const TSAnalytics = lazy(() => import("@/pages/admin/teacher-subscriptions/Analytics"));
const AiGenerations = lazy(() => import("@/pages/admin/teacher-subscriptions/AiGenerations"));
const TSAuditLogs = lazy(() => import("@/pages/admin/teacher-subscriptions/AuditLogs"));
const Posts = lazy(() => import("@/pages/admin/posts"));
const CreatePost = lazy(() => import("@/pages/admin/posts/Create"));
const EditPost = lazy(() => import("@/pages/admin/posts/Edit"));
const Comments = lazy(() => import("@/pages/admin/Comments"));
const Files = lazy(() => import("@/pages/admin/Files"));
const Academic = lazy(() =>
  import("@/pages/admin/Academic").then(({ default: Page }) => ({
    default: function AcademicRoute() {
      return <Page />;
    },
  }))
);
const SchoolClasses = lazy(() => import("@/pages/admin/SchoolClasses"));
const Subjects = lazy(() => import("@/pages/admin/Subjects"));
const Semesters = lazy(() => import("@/pages/admin/Semesters"));
const Calendar = lazy(() => import("@/pages/admin/Calendar"));
const Messages = lazy(() => import("@/pages/admin/Messages"));
const Notifications = lazy(() => import("@/pages/admin/Notifications"));
const Settings = lazy(() =>
  import("@/pages/admin/Settings").then(({ default: Page }) => ({
    default: function SettingsRoute() {
      return <Page />;
    },
  }))
);
const EmailBounceSettings = lazy(() => import("@/pages/admin/EmailBounceSettings"));
const EmailVerificationSettings = lazy(() => import("@/pages/admin/EmailVerificationSettings"));
const Profile = lazy(() => import("@/pages/public/Profile").then((m) => ({ default: m.Profile })));
const ContentAudit = lazy(() =>
  import("@/pages/admin/ContentAudit").then(({ default: Page }) => ({
    default: function ContentAuditRoute() {
      return <Page />;
    },
  }))
);
const AdsenseReadiness = lazy(() => import("@/pages/admin/AdsenseReadiness"));
const ContentReview = lazy(() => import("@/pages/admin/ContentReview"));
const ContentQuality = lazy(() => import("@/pages/admin/ContentQuality"));
const AICosts = lazy(() => import("@/pages/admin/AICosts"));
const ContactMessages = lazy(() => import("@/pages/admin/ContactMessages"));
const Analytics = lazy(() => import("@/pages/admin/Analytics"));
const Monitor = lazy(() => import("@/pages/admin/Monitor"));
const Performance = lazy(() => import("@/pages/admin/Performance"));
const Redis = lazy(() => import("@/pages/admin/Redis"));
const Sitemap = lazy(() => import("@/pages/admin/Sitemap"));
const Chatbot = lazy(() => import("@/pages/admin/Chatbot"));

// Temporary placeholders for incomplete routes
const Placeholder = ({ name }: { name: string }) => (
  <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed text-muted-foreground">
    <h2 className="text-xl font-bold mb-2">{name}</h2>
    <p>هذه الصفحة قيد الإنشاء.</p>
  </div>
);

function AdminRouteFallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center py-20">
      <Spinner className="size-8 text-primary" />
    </div>
  );
}

function AdminArea() {
  const [location] = useLocation();
  const { canAccessPrivilegedAdmin, hasPermission } = useAuth();

  if (!canAccessPrivilegedAdmin) {
    if (location.startsWith("/admin/messages") && hasPermission("manage messages")) {
      return <Redirect to="/dashboard/messages" />;
    }
    if (location.startsWith("/admin/notifications") && hasPermission("manage notifications")) {
      return <Redirect to="/dashboard/notifications" />;
    }
    return <Redirect to="/dashboard" />;
  }

  return (
    <AdminLayout>
      <Suspense fallback={<AdminRouteFallback />}>
        <Switch>
            <Route path="/admin" component={Dashboard} />
            <Route path="/admin/articles" component={Articles} />
            <Route path="/admin/articles/new" component={CreateArticle} />
            <Route path="/admin/articles/create" component={CreateArticle} />
            <Route path="/admin/articles/:id/edit" component={EditArticle} />
            <Route path="/admin/articles/edit/:id" component={EditArticle} />
            <Route path="/admin/categories" component={Categories} />
            <Route path="/admin/roles" component={Roles} />
            <Route path="/admin/permissions" component={Permissions} />
            <Route path="/admin/users" component={Users} />
            <Route path="/admin/users/:id" component={UserDetail} />
            <Route path="/admin/security" component={Security} />
            <Route path="/admin/security/logs" component={SecurityLogs} />
            <Route path="/admin/security/blocked-ips" component={BlockedIps} />
            <Route path="/admin/teacher-subscriptions" component={TeacherSubscriptions} />
            <Route path="/admin/teacher-subscriptions/orders/:id" component={SubscriptionOrderDetail} />
            <Route path="/admin/teacher-subscriptions/orders" component={SubscriptionOrders} />
            <Route path="/admin/teacher-subscriptions/subscriptions" component={SubscriptionsList} />
            <Route path="/admin/teacher-subscriptions/teachers/:id" component={TeacherDetail} />
            <Route path="/admin/teacher-subscriptions/teachers" component={TeachersDirectory} />
            <Route path="/admin/teacher-subscriptions/devices" component={DevicesList} />
            <Route path="/admin/teacher-subscriptions/downloads" component={DownloadsAudit} />
            <Route path="/admin/teacher-subscriptions/premium-files/:id" component={PremiumFileDetail} />
            <Route path="/admin/teacher-subscriptions/premium-files" component={PremiumFiles} />
            <Route path="/admin/teacher-subscriptions/reports" component={TSReports} />
            <Route path="/admin/teacher-subscriptions/analytics" component={TSAnalytics} />
            <Route path="/admin/teacher-subscriptions/ai-generations" component={AiGenerations} />
            <Route path="/admin/teacher-subscriptions/audit-logs" component={TSAuditLogs} />

            <Route path="/admin/posts" component={Posts} />
            <Route path="/admin/posts/new" component={CreatePost} />
            <Route path="/admin/posts/create" component={CreatePost} />
            <Route path="/admin/posts/:id/edit" component={EditPost} />
            <Route path="/admin/posts/edit/:id" component={EditPost} />
            <Route path="/admin/comments" component={Comments} />
            <Route path="/admin/files" component={Files} />
            <Route path="/admin/academic" component={Academic} />
            <Route path="/admin/school-classes" component={SchoolClasses} />
            <Route path="/admin/subjects" component={Subjects} />
            <Route path="/admin/semesters" component={Semesters} />
            <Route path="/admin/calendar" component={Calendar} />
            <Route path="/admin/messages" component={Messages} />
            <Route path="/admin/contact-messages" component={ContactMessages} />
            <Route path="/admin/notifications" component={Notifications} />
            <Route path="/admin/settings/email-bounce" component={EmailBounceSettings} />
            <Route path="/admin/settings/email-verification" component={EmailVerificationSettings} />
            <Route path="/admin/settings" component={Settings} />
            <Route path="/admin/profile" component={Profile} />
            <Route path="/admin/content-audit" component={ContentAudit} />
            <Route path="/admin/adsense-readiness" component={AdsenseReadiness} />
            <Route path="/admin/content-review" component={ContentReview} />
            <Route path="/admin/content-quality" component={ContentQuality} />
            <Route path="/admin/ai-costs" component={AICosts} />
            <Route path="/admin/analytics" component={Analytics} />
            <Route path="/admin/monitor" component={Monitor} />
            <Route path="/admin/performance" component={Performance} />
            <Route path="/admin/redis" component={Redis} />
            <Route path="/admin/sitemap" component={Sitemap} />
            <Route path="/admin/chatbot" component={Chatbot} />

            <Route><Placeholder name="الصفحة غير موجودة" /></Route>
        </Switch>
      </Suspense>
    </AdminLayout>
  );
}

export function AdminRoutes() {
  return (
    <RequireAdmin>
      <AdminArea />
    </RequireAdmin>
  );
}
