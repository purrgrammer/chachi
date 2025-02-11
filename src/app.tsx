import { Provider } from "jotai";
import { QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import ndk, { nwcNdk, NDKNWCContext, NDKContext } from "@/lib/ndk";
import { queryClient } from "@/lib/query";

import Layout from "@/pages/layout";
import Home from "@/pages/home";
import Group from "@/pages/group";
import Event from "@/pages/event";
import Wallet from "@/pages/wallet";
import Settings from "@/pages/settings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    loader: async () => {
      console.log("CONNECTING NDK instances");
      await ndk.connect();
      await nwcNdk.connect();
      return null;
    },
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: ":host",
        element: <Group />,
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
        path: "/settings",
        element: <Settings />,
      },
      {
        path: "/e/:nlink",
        element: <Event />,
      },
    ],
  },
]);

export default function App() {
  return (
    <Provider>
      <NDKNWCContext.Provider value={nwcNdk}>
        <NDKContext.Provider value={ndk}>
          <QueryClientProvider client={queryClient}>
            <SidebarProvider>
              <ThemeProvider defaultTheme="dark" storageKey="chachi-theme">
                <RouterProvider router={router} />
                <Toaster position="top-right" />
              </ThemeProvider>
            </SidebarProvider>
          </QueryClientProvider>
        </NDKContext.Provider>
      </NDKNWCContext.Provider>
    </Provider>
  );
}
