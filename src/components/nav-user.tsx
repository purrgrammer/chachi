import { useNavigate } from "@/lib/navigation";
import {
  ChevronsUpDown,
  LogOut,
  Moon,
  Sun,
  SunMoon,
  Check,
  Languages,
  Palette,
  Settings,
  Zap,
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
import { WalletBalance } from "@/components/wallet";
import { useAccount, useLogout } from "@/lib/account";
import { useTranslation } from "react-i18next";
import {
  NDKWallet,
  NDKCashuWallet,
  NDKNWCWallet,
  NDKWebLNWallet,
} from "@nostr-dev-kit/ndk-wallet";
import { useNDKWallets } from "@/lib/wallet";
import { changeLanguage } from "@/i18n";

function UserInfo({ pubkey }: { pubkey: string }) {
  return (
    <>
      <Avatar pubkey={pubkey} className="w-8 h-8 rounded-lg" />
      <div className="grid flex-1 text-sm leading-tight text-left">
        <span className="font-semibold truncate">
          <Name pubkey={pubkey} />
        </span>
        <span className="text-xs text-muted-foreground truncate">
          <Nip05 pubkey={pubkey} />
        </span>
      </div>
    </>
  );
}

export function NavUser() {
  const { isMobile, open, openMobile, state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [wallets] = useNDKWallets();
  const logout = useLogout();
  const account = useAccount();
  const navigate = useNavigate();
  const pubkey = account?.pubkey;
  const isExpanded = state === "expanded" || open || openMobile;
  const { t, i18n } = useTranslation();

  function openWallet(wallet: NDKWallet) {
    if (wallet instanceof NDKNWCWallet && wallet.pairingCode) {
      navigate(`/wallet/nwc/${encodeURIComponent(wallet.pairingCode)}`);
    } else if (wallet instanceof NDKCashuWallet) {
      navigate(`/wallet`);
    } else if (wallet instanceof NDKWebLNWallet) {
      navigate(`/wallet/webln`);
    }
  }

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
              className="rounded-lg w-[--radix-dropdown-menu-trigger-width] min-w-56"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex gap-2 items-center py-1.5 px-1 text-sm text-left">
                  <UserInfo pubkey={pubkey} />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/zaps")}>
                <Zap className="text-muted-foreground size-4" />
                {t("user.zaps")}
              </DropdownMenuItem>
              {wallets.map((wallet) => (
                <DropdownMenuItem onClick={() => openWallet(wallet)}>
                  <WalletBalance wallet={wallet} />
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="text-muted-foreground size-4" />
                {t("user.settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <div className="flex flex-row items-center gap-2">
                    <Languages className="text-muted-foreground size-4" />
                    <span>{t("user.language")}</span>
                  </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => changeLanguage("en")}>
                      <span>English</span>
                      {i18n.language === "en" ? (
                        <Check className="ml-auto" />
                      ) : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage("es")}>
                      <span>Español</span>
                      {i18n.language === "es" ? (
                        <Check className="ml-auto" />
                      ) : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage("zh-CN")}>
                      <span>简体中文</span>
                      {i18n.language === "zh-CN" ? (
                        <Check className="ml-auto" />
                      ) : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage("zh-TW")}>
                      <span>繁體中文</span>
                      {i18n.language === "zh-TW" ? (
                        <Check className="ml-auto" />
                      ) : null}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <div className="flex flex-row items-center gap-2">
                    <Palette className="size-4 text-muted-foreground" />
                    <span>{t("user.theme.trigger")}</span>
                  </div>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="text-muted-foreground" />
                      <span>{t("user.theme.light")}</span>
                      {theme === "light" ? <Check className="ml-auto" /> : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="text-muted-foreground" />
                      <span>{t("user.theme.dark")}</span>
                      {theme === "dark" ? <Check className="ml-auto" /> : null}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <SunMoon className="text-muted-foreground" />
                      <span>{t("user.theme.system")}</span>
                      {theme === "system" ? (
                        <Check className="ml-auto" />
                      ) : null}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="text-destructive dark:text-red-300" />
                {t("user.logout")}
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
