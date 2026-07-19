import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Public taxonomy/content changes much less frequently than admin data.
// Longer freshness windows make back/forward navigation and prefetched routes
// render immediately without unnecessary network requests.
queryClient.setQueryDefaults(["grades"], { staleTime: 30 * 60 * 1000 });
queryClient.setQueryDefaults(["grade"], { staleTime: 30 * 60 * 1000 });
queryClient.setQueryDefaults(["semesters"], { staleTime: 30 * 60 * 1000 });
queryClient.setQueryDefaults(["categories"], { staleTime: 15 * 60 * 1000 });
queryClient.setQueryDefaults(["latest-articles"], { staleTime: 5 * 60 * 1000 });
queryClient.setQueryDefaults(["article"], { staleTime: 5 * 60 * 1000 });
queryClient.setQueryDefaults(["posts"], { staleTime: 3 * 60 * 1000 });
queryClient.setQueryDefaults(["post"], { staleTime: 3 * 60 * 1000 });
