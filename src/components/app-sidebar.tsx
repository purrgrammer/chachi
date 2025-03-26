import * as React from "react";
import { useLocation, Link } from "react-router-dom";

import Logo from "@/components/logo";
import { NavUser } from "@/components/nav-user";
import { NavGroups } from "@/components/nav-groups";
import { NavPrivateGroups } from "@/components/nav-private-groups";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { pathname } = useLocation();
  return (
    <Sidebar collapsible="icon" {...props} className="z-50">
      <SidebarHeader>
        <Link
          to="/"
          className="flex items-center justify-center text-foreground"
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          <Logo className="size-8" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {pathname === "/dm" || pathname.startsWith("/dm/") ? (
          <NavPrivateGroups />
        ) : (
          <NavGroups />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
