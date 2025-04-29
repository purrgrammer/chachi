import { lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Provider } from "jotai";
import { QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import ndk, { nwcNdk, NDKContext } from "@/lib/ndk";
import { queryClient } from "@/lib/query";

const Layout = lazy(() => import("@/pages/layout"));
const Home = lazy(() => import("@/pages/home"));
const DirectMessages = lazy(() => import("@/pages/dms"));
const DirectMessageGroup = lazy(() => import("@/pages/dm-group"));
const Group = lazy(() => import("@/pages/group"));
const Event = lazy(() => import("@/pages/event"));
const Wallet = lazy(() => import("@/pages/wallet"));
const NWCWallet = lazy(() => import("@/pages/wallet/nwc"));
const WebLNWallet = lazy(() => import("@/pages/wallet/webln"));
const Settings = lazy(() => import("@/pages/settings"));
const Mint = lazy(() => import("@/pages/mint"));
const Nutzaps = lazy(() => import("@/pages/nutzaps"));
const Relay = lazy(() => import("@/pages/relay"));
const Community = lazy(() => import("@/pages/community"));

const LoadingScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <img src="/favicon.png" className="w-32 h-32 rounded-full" />
    </motion.div>
  );
};

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
        path: "/dm",
        element: <DirectMessages />,
      },
      {
        path: "/dm/:id",
        element: <DirectMessageGroup />,
      },
      {
        path: ":host",
        element: <Group />,
      },
      {
        path: "/c/:pubkey",
        element: <Community />,
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
        path: "/wallet",
        element: <Wallet />,
      },
      {
        path: "/wallet/nwc/:connection",
        element: <NWCWallet />,
      },
      {
        path: "/wallet/webln",
        element: <WebLNWallet />,
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
      {
        path: "/zaps",
        element: <Nutzaps />,
      },
      {
        path: "/relay/:relay",
        element: <Relay />,
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
              <RouterProvider router={router} />
              <Toaster
                toastOptions={{
                  duration: 1500,
                }}
                position="top-right"
              />
            </ThemeProvider>
          </SidebarProvider>
        </QueryClientProvider>
      </NDKContext.Provider>
    </Provider>
  );
}
