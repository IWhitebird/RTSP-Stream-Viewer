import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'

import { Header } from '@/components/Header'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

export const Route = createRootRoute({
  component: () => (
    <>
      <QueryClientProvider client={queryClient}>
      <Header />
          <Outlet />
          <ReactQueryDevtools initialIsOpen={false} />
          <TanStackRouterDevtools />
      </QueryClientProvider>
    </>
  ),
})
