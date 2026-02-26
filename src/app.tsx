import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Provider } from "jotai";
import { QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { LoadingScreen } from "@/components/loading-screen";
import { ErrorPage } from "@/components/error-page";
import { LastSeenSyncProvider } from "@/components/last-seen-sync-provider";
import { AuthToastProvider } from "@/components/auth-toast";
import ndk, { nwcNdk, NDKContext } from "@/lib/ndk";
import { queryClient } from "@/lib/query";

const Layout = lazy(() => import("@/pages/layout"));
const Home = lazy(() => import("@/pages/home"));
const Group = lazy(() => import("@/pages/group"));
const Event = lazy(() => import("@/pages/event"));
const CommunityEvent = lazy(() => import("@/pages/community-event"));
const Settings = lazy(() => import("@/pages/settings"));
const Mint = lazy(() => import("@/pages/mint"));
const Relay = lazy(() => import("@/pages/relay"));
const Community = lazy(() => import("@/pages/community"));
const CommunitySettings = lazy(() => import("@/pages/community-settings"));
const GroupSettings = lazy(() => import("@/pages/group-settings"));
const UserProfile = lazy(() => import("@/pages/user-profile"));
const Join = lazy(() => import("@/pages/join"));

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AnimatePresence>
        <Suspense fallback={<LoadingScreen />}>
          <Layout />
        </Suspense>
      </AnimatePresence>
    ),
    errorElement: <ErrorPage />,
    loader: async () => {
      console.log("CONNECTING NDK instances");
      await ndk.connect();
      return null;
    },
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/join/:code/:relay/:groupId",
        element: <Join />,
      },
      {
        path: ":host",
        element: <Group />,
      },
      {
        path: "/c/:identifier",
        element: <Community />,
      },
      {
        path: "/c/:identifier/settings",
        element: <CommunitySettings />,
      },
      {
        path: "/c/:identifier/e/:nlink",
        element: <CommunityEvent />,
      },
      {
        path: "/p/:identifier",
        element: <UserProfile />,
      },
      {
        path: "/p/:identifier/feed",
        element: <UserProfile tab="feed" />,
      },
      {
        path: "/posts/:host",
        element: <Group tab="posts" />,
      },
      {
        path: "/videos/:host",
        element: <Group tab="videos" />,
      },
      {
        path: "/polls/:host",
        element: <Group tab="polls" />,
      },
      {
        path: "/images/:host",
        element: <Group tab="images" />,
      },
      {
        path: ":host/e/:nlink",
        element: <Event />,
      },
      {
        path: ":host/settings",
        element: <GroupSettings />,
      },
      {
        path: ":host/:id/settings",
        element: <GroupSettings />,
      },
      {
        path: ":host/:id",
        element: <Group />,
      },
      {
        path: "/posts/:host/:id",
        element: <Group tab="posts" />,
      },
      {
        path: "/videos/:host/:id",
        element: <Group tab="videos" />,
      },
      {
        path: "/polls/:host/:id",
        element: <Group tab="polls" />,
      },
      {
        path: "/images/:host/:id",
        element: <Group tab="images" />,
      },
      {
        path: ":host/:id/e/:nlink",
        element: <Event />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
      {
        path: "/e/:nlink",
        element: <Event />,
      },
      {
        path: "/mint/:url",
        element: <Mint />,
      },
      // todo: remove this route, zaps will be on the notifications page
      {
        path: "/zaps",
        element: <Navigate to="/" replace />,
      },
      {
        path: "/relay/:relay",
        element: <Relay tab="info" />,
      },
      {
        path: "/relay/:relay/feed",
        element: <Relay tab="feed" />,
      },
      {
        path: "/relay/:relay/chat",
        element: <Relay tab="chat" />,
      },
      {
        path: "/relay/:relay/groups",
        element: <Relay tab="groups" />,
      },
      {
        path: "/relay/:relay/communities",
        element: <Relay tab="communities" />,
      },
    ],
  },
]);

export default function App() {
  return (
    <Provider>
      <NDKContext.Provider value={{ main: ndk, nwc: nwcNdk }}>
        <QueryClientProvider client={queryClient}>
          <SidebarProvider>
            <ThemeProvider defaultTheme="dark" storageKey="chachi-theme">
              <LastSeenSyncProvider />
              <AuthToastProvider />
              <RouterProvider router={router} />
              <Toaster
                toastOptions={{
                  duration: 1500,
                }}
                position="top-right"
              />
            </ThemeProvider>
          </SidebarProvider>
          <ReactQueryDevtools initialIsOpen={false} position="bottom" />
        </QueryClientProvider>
      </NDKContext.Provider>
    </Provider>
  );
}
