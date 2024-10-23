import * as React from "react";
import { Link } from "react-router-dom";

import Logo, { AnimatedLogo } from "@/components/logo";
import { NavUser } from "@/components/nav-user";
import { NavGroups } from "@/components/nav-groups";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [animate, setAnimate] = React.useState(false);
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon" {...props} className="z-50">
      <SidebarHeader>
        <Link
          to="/"
          className="flex items-center justify-center text-foreground"
          onMouseEnter={() => setAnimate(true)}
          onMouseLeave={() => setAnimate(false)}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
              setAnimate(false);
            }
          }}
        >
          {animate ? (
            <AnimatedLogo className="size-8" />
          ) : (
            <Logo className="size-8" />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroups />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
