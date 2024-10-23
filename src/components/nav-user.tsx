import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  SunMoon,
  Check,
} from "lucide-react";
import { Login } from "@/components/nostr/login";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { Nip05 } from "@/components/nostr/nip05";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAccount, useLogout } from "@/lib/account";

function UserInfo({ pubkey }: { pubkey: string }) {
  return (
    <>
      <Avatar pubkey={pubkey} className="h-8 w-8 rounded-lg" />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">
          <Name pubkey={pubkey} />
        </span>
        <span className="truncate text-xs">
          <Nip05 pubkey={pubkey} />
        </span>
      </div>
    </>
  );
}

export function NavUser() {
  const { isMobile, open, openMobile, state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const logout = useLogout();
  const account = useAccount();
  const pubkey = account?.pubkey;
  const isExpanded = state === "expanded" || open || openMobile;

  return (
    <SidebarMenu>
      {pubkey ? (
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <UserInfo pubkey={pubkey} />
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserInfo pubkey={pubkey} />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span>Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun />
                      <span>Light</span>
                      {theme === "light" ? <Check className="ml-auto" /> : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon />
                      <span>Dark</span>
                      {theme === "dark" ? <Check className="ml-auto" /> : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <SunMoon />
                      <span>System</span>
                      {theme === "system" ? (
                        <Check className="ml-auto" />
                      ) : null}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      ) : (
        <Login isCompact={!isExpanded} />
      )}
    </SidebarMenu>
  );
}
