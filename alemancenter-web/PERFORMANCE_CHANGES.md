# Performance & Navigation Changes

This copy contains focused performance improvements without redesigning the application.

## Applied
- Added a shared React Query client with longer cache windows for public taxonomy/content data.
- Added automatic same-origin link prefetching using event delegation.
- Prefetches both lazy route chunks and React Query data for grades, grade details, subjects, articles, posts, and post categories.
- Starts home-page grades/articles/categories requests immediately instead of delaying them by 1.2s + idle time.
- Replaced internal `/grades` navigation on the home/footer with canonical country-aware lesson URLs.
- Reduced the lazy-route fallback from a full viewport takeover to a compact shell-preserving loader.
- Delayed comment requests until the primary article/post has loaded, prioritizing main content.
- Added safe slug-to-category-id resolution before category-post data prefetch.

## Validation
The modified TypeScript/TSX files were syntax-checked with TypeScript `transpileModule` and passed.
A full dependency-aware `pnpm build` could not be run in the execution environment because the uploaded archive does not contain `node_modules`, `pnpm` is not installed locally, and external npm registry access is unavailable.

## Authentication session reliability fix

- Authentication bootstrap now runs immediately on every hard reload instead of waiting for the first user interaction or a 7-second idle timeout.
- Initial auth state stays in `isLoading` until the first session check completes, preventing a valid session from being announced as logged out prematurely.
- Concurrent `refreshUser()` calls are deduplicated to avoid refresh-token rotation races.
- `/auth/refresh` now accepts access tokens returned either at the top level (`token` / `access_token`) or nested under `data`.
- Same-origin credentials are explicitly included on API and refresh requests so the httpOnly refresh cookie is sent reliably.
- Temporary network/server failures no longer clear authentication state as if they were a real 401/403 logout.
- Navbar login/register controls are hidden behind an auth-loading placeholder until the initial session check completes, eliminating login-state flicker.

## Mobile navigation fixes
- Show a compact authenticated user icon in the mobile header (`sm:hidden`) linking to the profile.
- Show an authentication loading placeholder on mobile while the session is being checked.
- Add a signed-in account panel inside the mobile drawer with profile/dashboard/teacher/logout actions.
- Constrain the mobile drawer to `100dvh` and use `overflow-y-auto` for the inner content so all items remain reachable on short screens.
- Add safe-area-aware bottom padding for mobile devices.
