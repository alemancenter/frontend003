import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useParams, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";

import { AuthProvider } from "@/contexts/AuthContext";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { CountryProvider } from "@/contexts/CountryContext";
import { RequireAuth, RequirePermission, RequireTeacherPortal } from "@/components/ProtectedRoute";

import { PublicLayout } from "@/components/layout/PublicLayout";

import { DEFAULT_COUNTRY } from "@/lib/country";

const NotFound = lazy(() => import("@/pages/not-found"));

const Home = lazy(() => import("@/pages/public/Home").then((m) => ({ default: m.Home })));
const Articles = lazy(() => import("@/pages/public/Articles").then((m) => ({ default: m.Articles })));
const ArticleDetail = lazy(() => import("@/pages/public/ArticleDetail").then((m) => ({ default: m.ArticleDetail })));
const ArticleDownload = lazy(() => import("@/pages/public/ArticleDownload").then((m) => ({ default: m.ArticleDownload })));
const GradesIndex = lazy(() => import("@/pages/public/GradesIndex").then((m) => ({ default: m.GradesIndex })));
const GradeDetail = lazy(() => import("@/pages/public/GradeDetail").then((m) => ({ default: m.GradeDetail })));
const SubjectDetail = lazy(() => import("@/pages/public/SubjectDetail").then((m) => ({ default: m.SubjectDetail })));
const Posts = lazy(() => import("@/pages/public/Posts").then((m) => ({ default: m.Posts })));
const PostDetail = lazy(() => import("@/pages/public/PostDetail").then((m) => ({ default: m.PostDetail })));
const CategoryPosts = lazy(() => import("@/pages/public/CategoryPosts").then((m) => ({ default: m.CategoryPosts })));
const PublicCalendar = lazy(() => import("@/pages/public/Calendar").then((m) => ({ default: m.PublicCalendar })));
const Contact = lazy(() => import("@/pages/public/Contact").then((m) => ({ default: m.Contact })));
const AuthScreens = lazy(() => import("@/pages/public/Auth").then((m) => ({ default: m.AuthScreens })));
const Profile = lazy(() => import("@/pages/public/Profile").then((m) => ({ default: m.Profile })));
const MemberDashboard = lazy(() => import("@/pages/member/Dashboard"));
const MemberMessages = lazy(() => import("@/pages/admin/Messages"));
const MemberNotifications = lazy(() => import("@/pages/admin/Notifications"));
const LegalPage = lazy(() => import("@/pages/public/LegalPage").then((m) => ({ default: m.LegalPage })));
const TeacherSubscriptionPublic = lazy(() =>
  import("@/pages/public/TeacherSubscriptionPublic").then((m) => ({ default: m.TeacherSubscriptionPublic })),
);
const AboutUs = lazy(() => import("@/pages/public/AboutUs").then((m) => ({ default: m.AboutUs })));
const Faq = lazy(() => import("@/pages/public/Faq").then((m) => ({ default: m.Faq })));
const Copyright = lazy(() => import("@/pages/public/Copyright").then((m) => ({ default: m.Copyright })));
const EditorialPolicy = lazy(() => import("@/pages/public/EditorialPolicy").then((m) => ({ default: m.EditorialPolicy })));
const ForgotPassword = lazy(() => import("@/pages/public/ForgotPassword").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("@/pages/public/ResetPassword").then((m) => ({ default: m.ResetPassword })));
const Search = lazy(() => import("@/pages/public/Search").then((m) => ({ default: m.Search })));
const Team = lazy(() => import("@/pages/public/Team").then((m) => ({ default: m.Team })));
const KeywordDetail = lazy(() => import("@/pages/public/KeywordDetail").then((m) => ({ default: m.KeywordDetail })));

const AdminRoutes = lazy(() => import("@/pages/admin").then((m) => ({ default: m.AdminRoutes })));

const TeacherLayout = lazy(() =>
  import("@/components/teacher/TeacherLayout").then((m) => ({ default: m.TeacherLayout })),
);
const DashboardPage = lazy(() => import("@/pages/teacher/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const SubscribePage = lazy(() => import("@/pages/teacher/SubscribePage").then((m) => ({ default: m.SubscribePage })));
const LibraryPage = lazy(() => import("@/pages/teacher/LibraryPage").then((m) => ({ default: m.LibraryPage })));
const MyLibraryPage = lazy(() => import("@/pages/teacher/MyLibraryPage").then((m) => ({ default: m.MyLibraryPage })));
const AiStudioPage = lazy(() => import("@/pages/teacher/AiStudioPage").then((m) => ({ default: m.AiStudioPage })));
const DownloadsPage = lazy(() => import("@/pages/teacher/DownloadsPage").then((m) => ({ default: m.DownloadsPage })));
const DevicesPage = lazy(() => import("@/pages/teacher/DevicesPage").then((m) => ({ default: m.DevicesPage })));
const NotificationsPage = lazy(() =>
  import("@/pages/teacher/NotificationsPage").then((m) => ({ default: m.NotificationsPage })),
);
const OrdersPage = lazy(() => import("@/pages/teacher/OrdersPage").then((m) => ({ default: m.OrdersPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 min — avoid immediate refetch on every remount/navigation
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RouteFallback() {
  // Reserve a full viewport height while the lazy route loads. This keeps the
  // page footer below the fold during loading, so it doesn't jump downward when
  // the (much taller) real content mounts — the single biggest CLS source.
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center py-20">
      <Spinner className="size-8 text-primary" />
    </div>
  );
}

function RedirectWithParam({ to }: { to: (params: Record<string, string>) => string }) {
  const params = useParams();
  return <Redirect to={to(params as Record<string, string>)} />;
}

// wouter (like most SPA routers) doesn't touch scroll position on navigation,
// so it stays wherever the previous page left it — new pages otherwise open
// mid-scroll instead of at the top.
function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

function PublicRoutes() {
  return (
    <PublicLayout>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/" component={Home} />

          {/* Canonical country-prefixed lesson & posts routes (matches old frontend) */}
          {/* IMPORTANT: more-specific routes must appear before catch-all param routes */}

          {/* Stub guard — redirect partial paths before the :classId param catches them */}
          <Route path="/:country/lesson/articles">
            <RedirectWithParam to={(p) => `/${p.country}/lesson`} />
          </Route>
          <Route path="/:country/lesson/subjects">
            <RedirectWithParam to={(p) => `/${p.country}/lesson`} />
          </Route>
          <Route path="/:country/posts/category">
            <RedirectWithParam to={(p) => `/${p.country}/posts`} />
          </Route>

          {/* Specific multi-segment lesson routes (must come before /:country/lesson/:classId) */}
          <Route
            path="/:country/lesson/subjects/:subjectId/articles/:semesterId/:categoryId"
            component={SubjectDetail}
          />
          <Route path="/:country/lesson/subjects/:subjectId" component={SubjectDetail} />
          <Route path="/:country/lesson/articles/:articleId" component={ArticleDetail} />

          {/* Generic single-segment lesson & posts param routes */}
          <Route path="/:country/lesson" component={GradesIndex} />
          <Route path="/:country/lesson/:classId" component={GradeDetail} />
          <Route path="/:country/posts/category/:categoryId" component={CategoryPosts} />
          <Route path="/:country/posts" component={Posts} />
          <Route path="/:country/posts/:postId" component={PostDetail} />

          {/* Legacy short bridge routes (kept working, 301-style redirect to canonical path) */}
          <Route path="/articles/:articleId">
            <RedirectWithParam to={(p) => `/${DEFAULT_COUNTRY}/lesson/articles/${p.articleId}`} />
          </Route>
          <Route path="/posts/:postId">
            <RedirectWithParam to={(p) => `/${DEFAULT_COUNTRY}/posts/${p.postId}`} />
          </Route>
          <Route path="/posts">
            <Redirect to={`/${DEFAULT_COUNTRY}/posts`} />
          </Route>
          <Route path="/news/:postId">
            <RedirectWithParam to={(p) => `/${DEFAULT_COUNTRY}/posts/${p.postId}`} />
          </Route>
          <Route path="/news">
            <Redirect to={`/${DEFAULT_COUNTRY}/posts`} />
          </Route>
          <Route path="/grades">
            <Redirect to={`/${DEFAULT_COUNTRY}/lesson`} />
          </Route>
          <Route path="/classes">
            <Redirect to={`/${DEFAULT_COUNTRY}/lesson`} />
          </Route>
          <Route path="/grades/:classId/subjects/:subjectId">
            <RedirectWithParam to={(p) => `/${DEFAULT_COUNTRY}/lesson/subjects/${p.subjectId}`} />
          </Route>
          <Route path="/grades/:classId">
            <RedirectWithParam to={(p) => `/${DEFAULT_COUNTRY}/lesson/${p.classId}`} />
          </Route>

          {/* Convenience/utility pages, not part of the old URL scheme */}
          <Route path="/articles/file/:fileId/download" component={ArticleDownload} />
          <Route path="/articles" component={Articles} />
          <Route path="/calendar" component={PublicCalendar} />

          {/* Static pages (verbatim names/paths from the old frontend, for SEO parity) */}
          <Route path="/about-us" component={AboutUs} />
          <Route path="/about">
            <Redirect to="/about-us" />
          </Route>
          <Route path="/faq" component={Faq} />
          <Route path="/contact-us" component={Contact} />
          <Route path="/contact">
            <Redirect to="/contact-us" />
          </Route>
          <Route path="/copyright" component={Copyright} />
          <Route path="/editorial-policy" component={EditorialPolicy} />
          <Route path="/privacy-policy">
            <LegalPage type="privacy-policy" />
          </Route>
          <Route path="/terms-of-service">
            <LegalPage type="terms-of-service" />
          </Route>
          <Route path="/terms">
            <Redirect to="/terms-of-service" />
          </Route>
          <Route path="/cookie-policy">
            <LegalPage type="cookie-policy" />
          </Route>
          <Route path="/disclaimer">
            <LegalPage type="disclaimer" />
          </Route>

          <Route path="/search" component={Search} />
          <Route path="/team" component={Team} />
          <Route path="/keywords/:keyword" component={KeywordDetail} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/login" component={AuthScreens} />
          <Route path="/register" component={AuthScreens} />
          <Route path="/profile">
            <RequireTeacherPortal>
              <Profile />
            </RequireTeacherPortal>
          </Route>
          <Route path="/dashboard/messages">
            <RequirePermission permission="manage messages">
              <MemberMessages />
            </RequirePermission>
          </Route>
          <Route path="/dashboard/notifications">
            <RequirePermission permission="manage notifications">
              <MemberNotifications />
            </RequirePermission>
          </Route>
          <Route path="/dashboard">
            <RequireAuth>
              <MemberDashboard />
            </RequireAuth>
          </Route>
          <Route path="/teacher-subscription" component={TeacherSubscriptionPublic} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </PublicLayout>
  );
}

function TeacherRoutes() {
  return (
    <RequireTeacherPortal>
      <Suspense fallback={<RouteFallback />}>
        <TeacherLayout>
          <Switch>
            <Route path="/teacher" component={DashboardPage} />
            <Route path="/teacher/subscribe" component={SubscribePage} />
            <Route path="/teacher/library" component={LibraryPage} />
            <Route path="/teacher/my-library" component={MyLibraryPage} />
            <Route path="/teacher/ai-studio" component={AiStudioPage} />
            <Route path="/teacher/downloads" component={DownloadsPage} />
            <Route path="/teacher/devices" component={DevicesPage} />
            <Route path="/teacher/notifications" component={NotificationsPage} />
            <Route path="/teacher/orders" component={OrdersPage} />
            <Route path="/teacher/profile" component={Profile} />
            <Route component={NotFound} />
          </Switch>
        </TeacherLayout>
      </Suspense>
    </RequireTeacherPortal>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/admin/*" component={AdminRoutes} />
        <Route path="/admin" component={AdminRoutes} />
        <Route path="/teacher/*" component={TeacherRoutes} />
        <Route path="/teacher" component={TeacherRoutes} />
        <Route path="/*" component={PublicRoutes} />
        <Route path="/" component={PublicRoutes} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SiteSettingsProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <CountryProvider>
                <ScrollToTop />
                <Router />
              </CountryProvider>
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </SiteSettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
