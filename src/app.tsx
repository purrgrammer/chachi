import { Provider } from "jotai";
import { QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import ndk, { NDKContext } from "@/lib/ndk";
import { queryClient } from "@/lib/query";

import Layout from "@/pages/layout";
import Home from "@/pages/home";
import Group from "@/pages/group";
import Event from "@/pages/event";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    loader: async () => {
      console.log("CONNECTING NDK");
      await ndk.connect();
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
        path: ":host/e/:nlink",
        element: <Event />,
      },
      {
        path: ":host/:id",
        element: <Group />,
      },
      {
        path: ":host/:id/e/:nlink",
        element: <Event />,
      },
    ],
  },
]);

export default function App() {
  return (
    <Provider>
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
    </Provider>
  );
}
