import { useNavigate } from "@/lib/navigation";
import { ChevronsUpDown, LogOut, Settings, Castle, User } from "lucide-react";
import { Login } from "@/components/nostr/login";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { Nip05 } from "@/components/nostr/nip05";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
} from "@nostr-dev-kit/wallet";
import { useNDKWallets } from "@/lib/wallet";
import { useAtomValue } from "jotai";
import { communikeyAtom } from "@/app/store";

function UserInfo({ pubkey }: { pubkey: string }) {
  return (
    <div className="flex gap-2 items-center py-1.5 px-1 text-sm text-left">
      <Avatar pubkey={pubkey} className="w-8 h-8 rounded-lg" />
      <div className="grid flex-1 text-sm leading-tight text-left">
        <span className="font-semibold truncate">
          <Name pubkey={pubkey} />
        </span>
        <span className="text-xs text-muted-foreground truncate">
          <Nip05 pubkey={pubkey} />
        </span>
      </div>
    </div>
  );
}

export function NavUser() {
  const { isMobile, open, openMobile, state } = useSidebar();
  const [wallets] = useNDKWallets();
  const logout = useLogout();
  const account = useAccount();
  const navigate = useNavigate();
  const pubkey = account?.pubkey;
  const isExpanded = state === "expanded" || open || openMobile;
  const { t } = useTranslation();
  const communikey = useAtomValue(communikeyAtom);

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
    <>
      <SidebarMenu>
        {pubkey ? (
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=closed]:hover:bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
                  <UserInfo pubkey={pubkey} />
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/p/${pubkey}`)}>
                  <User className="text-muted-foreground size-4" />
                  {t("user.profile", "Profile")}
                </DropdownMenuItem>
                {communikey && (
                  <DropdownMenuItem onClick={() => navigate(`/c/${pubkey}`)}>
                    <Castle className="text-muted-foreground size-4" />
                    {t("user.community")}
                  </DropdownMenuItem>
                )}
                {wallets.length > 0 ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>{t("user.wallets")}</DropdownMenuLabel>
                    {wallets.map((wallet) => (
                      <DropdownMenuItem onClick={() => openWallet(wallet)}>
                        <WalletBalance wallet={wallet} size="sm" />
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="text-muted-foreground size-4" />
                  {t("user.settings")}
                </DropdownMenuItem>
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
    </>
  );
}
