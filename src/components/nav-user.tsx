import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@/lib/navigation";
import {
  ChevronsUpDown,
  LogOut,
  Settings,
  Zap,
  HandHeart,
  Castle,
  User,
} from "lucide-react";
import { Login } from "@/components/nostr/login";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { Nip05 } from "@/components/nostr/nip05";
import { NewZapDialog } from "@/components/nostr/zap";
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
} from "@nostr-dev-kit/ndk-wallet";
import { useNDKWallets } from "@/lib/wallet";
import { CHACHI_PUBKEY, CHACHI_GROUP } from "@/constants";
import { useAtomValue } from "jotai";
import { communikeyAtom } from "@/app/store";

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
  const [wallets] = useNDKWallets();
  const [showDonateDialog, setShowDonateDialog] = useState(false);
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

  function onZap() {
    setShowDonateDialog(false);
    toast.success(t("user.thank-you"));
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
                <DropdownMenuItem onClick={() => navigate("/zaps")}>
                  <Zap className="text-muted-foreground size-4" />
                  {t("user.zaps")}
                </DropdownMenuItem>
                {wallets.length > 0 ? (
                  <>
                    <DropdownMenuSeparator />
                    {wallets.map((wallet) => (
                      <DropdownMenuItem onClick={() => openWallet(wallet)}>
                        <WalletBalance wallet={wallet} />
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="text-muted-foreground size-4" />
                  {t("user.settings")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDonateDialog(true)}>
                  <HandHeart className="text-muted-foreground size-4" />
                  {t("user.donate")}
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
      {showDonateDialog ? (
        <NewZapDialog
          open
          title={t("user.support-chachi")}
          description={t("user.support-chachi-description")}
          defaultAmount={420}
          onClose={() => setShowDonateDialog(false)}
          onZap={onZap}
          pubkey={CHACHI_PUBKEY}
          group={CHACHI_GROUP}
          zapType="nip-57"
        />
      ) : null}
    </>
  );
}
