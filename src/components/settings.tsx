import { useAtom } from "jotai";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { NostrEvent } from "nostr-tools";
import { z } from "zod";
import { Pubkey } from "@/components/nostr/pubkey";
import { useTranslation } from "react-i18next";
import {
  Check,
  Settings,
  Moon,
  Sun,
  Zap as ZapIcon,
  SunMoon,
  Wallet as WalletIcon,
  WalletCards,
  PlugZap,
  Puzzle,
  Landmark,
  Server,
  HandCoins,
  Languages,
  Palette,
  SquareArrowOutUpRight,
} from "lucide-react";
import { NDKEvent, NDKKind, NDKRelaySet } from "@nostr-dev-kit/ndk";
import {
  NDKWallet,
  NDKCashuWallet,
  NDKWebLNWallet,
  NDKNWCWallet,
} from "@nostr-dev-kit/ndk-wallet";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MintLink } from "@/components/mint";
import { RelayIcon, RelayName } from "@/components/nostr/relay";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  CreateWallet,
  CashuWalletSettings,
  ConnectWallet,
  NWCWalletBalanceAmount,
  CashuWalletBalanceAmount,
  WebLNWalletBalanceAmount,
  WalletName,
} from "@/components/wallet";
import { User } from "@/components/nostr/user";
import { useTheme } from "@/components/theme-provider";
import { changeLanguage, languages, Language } from "@/i18n";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  walletId,
  useWallets,
  useNDKWallets,
  useCashuWallet,
} from "@/lib/wallet";
import { usePubkey } from "@/lib/account";
import { useNDK } from "@/lib/ndk";
import { mintListAtom } from "@/app/store";
import { themes, Theme } from "@/theme";
import { useRelays } from "@/lib/nostr";
import { cn } from "@/lib/utils";

const uiSchema = z.object({
  language: z.enum(languages),
  theme: z.enum(themes),
});

function UILanguage({ lang }: { lang: Language }) {
  const { i18n } = useTranslation();
  const displayName = new Intl.DisplayNames([i18n.language], {
    type: "language",
  });
  return <span className="capitalize">{displayName.of(lang)}</span>;
}

function UITheme({ theme }: { theme: "light" | "dark" | "system" }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row items-center gap-1">
      {theme === "light" ? (
        <Sun className="size-4 text-muted-foreground" />
      ) : theme === "dark" ? (
        <Moon className="size-4 text-muted-foreground" />
      ) : (
        <SunMoon className="size-4 text-muted-foreground" />
      )}
      <span>
        {theme === "light"
          ? t("settings.ui.theme.light")
          : theme === "dark"
            ? t("settings.ui.theme.dark")
            : t("settings.ui.theme.system")}
      </span>
    </div>
  );
}

export function UI() {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const language = i18n.language as Language;
  const form = useForm<z.infer<typeof uiSchema>>({
    resolver: zodResolver(uiSchema),
    defaultValues: {
      language,
      theme,
    },
  });

  function onSubmit() {
    console.log("submit");
  }

  function changeTheme(newTheme: "light" | "dark" | "system") {
    setTheme(newTheme);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-row gap-1 items-center flex-wrap">
            <Languages className="size-4 text-muted-foreground" />
            <h4 className="text-sm uppercase font-light text-muted-foreground">
              {t("settings.ui.language.title")}
            </h4>
          </div>
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Select
                    onValueChange={(props: Language) => {
                      field.onChange(props);
                      changeLanguage(props);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "settings.ui.language.select-placeholder",
                          )}
                        >
                          <UILanguage lang={language} />
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          <UILanguage lang={lang} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-row gap-1 items-center flex-wrap">
            <Palette className="size-4 text-muted-foreground" />
            <h4 className="text-sm uppercase font-light text-muted-foreground">
              {t("settings.ui.theme.title")}
            </h4>
          </div>
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Select
                    onValueChange={(props: Theme) => {
                      field.onChange(props);
                      changeTheme(props);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "settings.ui.theme.select-placeholder",
                          )}
                        >
                          <UITheme theme={theme} />
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {themes.map((theme) => (
                        <SelectItem key={theme} value={theme}>
                          <UITheme theme={theme} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}

function WalletSummary({
  wallet,
  showControls = false,
}: {
  wallet: NDKWallet;
  showControls?: boolean;
}) {
  const ndk = useNDK();
  const { t } = useTranslation();
  const [, setWallets] = useWallets();
  const [, setNDKWallets] = useNDKWallets();
  const [p2pk, setP2pk] = useState<string | null>(null);
  const [mintList] = useAtom(mintListAtom);
  const me = usePubkey();
  const navigate = useNavigate();
  const myRelays = useRelays();
  const { pubkey, lud16 } = useMemo(() => {
    if (wallet instanceof NDKNWCWallet) {
      const u = new URL(wallet.pairingCode || "");
      const pubkey = u.host ?? u.pathname;
      const relays = u.searchParams.getAll("relay");
      const lud16 = u.searchParams.get("lud16");
      return { relays, pubkey, lud16 };
    }
    return {};
  }, []);
  const isEnabled =
    wallet instanceof NDKCashuWallet &&
    p2pk &&
    mintList?.pubkey &&
    wallet.p2pks.includes(mintList.pubkey);

  function openWallet() {
    if (wallet instanceof NDKCashuWallet) {
      navigate("/wallet");
    } else if (wallet instanceof NDKNWCWallet) {
      navigate(`/wallet/nwc/${encodeURIComponent(wallet.pairingCode!)}`);
    } else if (wallet instanceof NDKWebLNWallet) {
      navigate("/wallet/webln");
    }
  }

  useEffect(() => {
    if (wallet instanceof NDKCashuWallet) {
      wallet.getP2pk().then((p2pk) => setP2pk(p2pk));
    }
  }, [wallet]);

  async function enableCashuWallet() {
    try {
      if (!(wallet instanceof NDKCashuWallet)) {
        return;
      }
      const cashu = wallet as NDKCashuWallet;
      if (!p2pk || !cashu.relaySet) {
        toast.error(t("settings.wallet.enable-error"));
        return;
      }
      const event = new NDKEvent(ndk, {
        kind: NDKKind.CashuMintList,
        tags: [
          ["pubkey", p2pk],
          ...cashu.relaySet.relayUrls.map((r) => ["relay", r]),
          ...cashu.mints.map((m) => ["mint", m]),
        ],
      } as NostrEvent);
      await event.publish(NDKRelaySet.fromRelayUrls(myRelays, ndk));
      toast.success(t("settings.wallet.enable-success"));
    } catch (err) {
      toast.error(t("settings.wallet.enable-error"));
      console.error(err);
    }
  }

  function removeWallet() {
    setWallets((wallets) =>
      wallets.filter((w) => {
        if (w.type === "nip60" && wallet.type === "nip-60") {
          return false;
        } else if (
          w.type === "nwc" &&
          wallet.type === "nwc" &&
          wallet instanceof NDKNWCWallet
        ) {
          return w.connection !== wallet.pairingCode;
        } else if (w.type === "webln" && wallet.type === "webln") {
          return false;
        }
        return true;
      }),
    );
    setNDKWallets((wallets) =>
      wallets.filter((w) => walletId(w) !== walletId(wallet)),
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex flex-row items-center justify-between font-normal">
          <div className="flex flex-row items-center gap-1.5">
            {wallet.type === "nip-60" ? (
              <WalletIcon className="size-6 text-muted-foreground" />
            ) : wallet.type === "nwc" ? (
              <PlugZap className="size-6 text-muted-foreground" />
            ) : (
              <Puzzle className="size-6 text-muted-foreground" />
            )}
            {wallet.type === "nwc" && pubkey ? (
              <User
                pubkey={pubkey}
                classNames={{ avatar: "size-5", name: "text-md" }}
              />
            ) : wallet.type === "webln" ? (
              <WalletName wallet={wallet} />
            ) : me ? (
              <User
                pubkey={me}
                classNames={{ avatar: "size-5", name: "text-md" }}
              />
            ) : null}
          </div>
          <div className="flex flex-row items-center gap-1.5">
            <Button variant="ghost" size="tiny" onClick={openWallet}>
              <div className="flex flex-row items-center gap-1">
                <SquareArrowOutUpRight />
                {t("settings.wallet.wallets.open")}
              </div>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0 items-center justify-center">
            <div className="flex items-center justify-center">
              {wallet.type === "nwc" && wallet instanceof NDKNWCWallet ? (
                <NWCWalletBalanceAmount
                  wallet={wallet}
                  classNames={{ icon: "size-12", text: "text-6xl font-light" }}
                />
              ) : wallet.type === "nip-60" &&
                wallet instanceof NDKCashuWallet ? (
                <CashuWalletBalanceAmount
                  wallet={wallet}
                  classNames={{ icon: "size-12", text: "text-6xl font-light" }}
                />
              ) : wallet instanceof NDKWebLNWallet ? (
                <WebLNWalletBalanceAmount
                  wallet={wallet}
                  classNames={{ icon: "size-12", text: "text-6xl font-light" }}
                />
              ) : null}
            </div>
            {lud16 ? (
              <div className="flex flex-row gap-1 items-center">
                <ZapIcon className="size-3 text-muted-foreground" />
                <span className="text-xs font-mono">{lud16}</span>
              </div>
            ) : null}
            {p2pk ? <Pubkey pubkey={p2pk} /> : null}
          </div>
          <div className="flex flex-row justify-between">
            {wallet instanceof NDKCashuWallet ? (
              <MintList mints={wallet.mints} className="flex-1" />
            ) : null}
            {wallet instanceof NDKCashuWallet && wallet.relaySet ? (
              <RelayList
                relays={wallet.relaySet.relayUrls}
                className="flex-1"
              />
            ) : null}
          </div>
        </div>
      </CardContent>
      {showControls ? (
        <CardFooter className="flex justify-end">
          <div className="flex flex-row gap-2 items-center justify-between">
            {wallet.type !== "nip-60" ? (
              <Button
                onClick={removeWallet}
                variant="destructive"
                className="w-full"
                size="sm"
              >
                {t("settings.wallet.wallets.remove")}
              </Button>
            ) : (
              <>
                {wallet instanceof NDKCashuWallet ? (
                  <>
                    <Button
                      disabled={Boolean(isEnabled)}
                      variant="outline"
                      size="sm"
                      onClick={enableCashuWallet}
                    >
                      {isEnabled ? (
                        <Check className="text-green-500" />
                      ) : (
                        <HandCoins />
                      )}
                      {isEnabled
                        ? t("settings.wallet.enabled")
                        : t("settings.wallet.enable")}
                    </Button>
                    <CashuWalletSettings wallet={wallet}>
                      <Button variant="outline" size="sm">
                        <Settings />
                        {t("settings.wallet.settings")}
                      </Button>
                    </CashuWalletSettings>
                  </>
                ) : null}
              </>
            )}
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function RelayList({
  relays,
  className,
}: {
  relays: string[];
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-row gap-1 items-center flex-wrap">
        <Server className="size-4 text-muted-foreground" />
        <h4 className="text-sm uppercase font-light text-muted-foreground">
          {t("settings.wallet.relays")}
        </h4>
      </div>
      <div className="flex flex-col gap-0.5">
        {relays.map((t) => (
          <div key={t} className="flex flex-row items-center gap-1">
            <RelayIcon relay={t} className="size-4" />
            <span className="text-sm">
              <RelayName relay={t} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MintList({
  mints,
  className,
}: {
  mints: string[];
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-row gap-1 items-center flex-wrap">
        <Landmark className="size-4 text-muted-foreground" />
        <h4 className="text-sm uppercase font-light text-muted-foreground">
          {t("settings.wallet.mints")}
        </h4>
      </div>
      <div className="flex flex-col gap-0.5">
        {mints.map((t) => (
          <MintLink
            key={t}
            url={t}
            classNames={{ icon: "size-4", name: "text-sm" }}
          />
        ))}
      </div>
    </div>
  );
}

export function Wallet() {
  const { t } = useTranslation();
  const cashuWallet = useCashuWallet();
  const [ndkWallets] = useNDKWallets();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-row gap-1.5 items-center">
            <HandCoins className="size-4 text-muted-foreground" />
            <h3 className="text-sm uppercase font-light text-muted-foreground">
              {t("settings.wallet.payments.title")}
            </h3>
          </div>
          <p className="text-xs">{t("settings.wallet.payments.description")}</p>
        </div>
        {cashuWallet ? (
          <WalletSummary
            key={walletId(cashuWallet)}
            wallet={cashuWallet}
            showControls
          />
        ) : (
          <CreateWallet />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-row gap-1.5 items-center">
          <WalletCards className="size-4 text-muted-foreground" />
          <h3 className="text-sm uppercase font-light text-muted-foreground">
            {t("settings.wallet.wallets.title")}
          </h3>
        </div>
        {ndkWallets
          .filter((w) => w.type !== "nip-60")
          .map((w) => (
            <WalletSummary key={walletId(w)} wallet={w} showControls />
          ))}
      </div>
      <div className="flex flex-col gap-2">
        <ConnectWallet />
      </div>
    </div>
  );
}
