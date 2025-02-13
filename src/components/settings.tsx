import { useMemo } from "react";
import { z } from "zod";
import { NostrEvent } from "nostr-tools";
import { useTranslation } from "react-i18next";
import {
  Moon,
  Sun,
  Zap as ZapIcon,
  SunMoon,
  Wallet as WalletIcon,
  PlugZap,
  Puzzle,
  Landmark,
  Server,
} from "lucide-react";
import { NDKCashuWallet, NDKNWCWallet } from "@nostr-dev-kit/ndk-wallet";
import { InputCopy } from "@/components/ui/input-copy";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MintIcon, MintName } from "@/components/mint";
import { RelayIcon, RelayName } from "@/components/nostr/relay";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
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
  ConnectWallet,
  NWCWalletBalanceAmount,
  CashuWalletBalanceAmount,
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
  useWallet,
  useDefaultWallet,
  useNutsack,
  ChachiWallet,
} from "@/lib/wallet";
import { themes, Theme } from "@/theme";

const uiSchema = z.object({
  language: z.enum(languages),
  theme: z.enum(themes),
});

function UILanguage({ lang }: { lang: Language }) {
  return (
    <span>
      {lang === "en"
        ? "English"
        : lang === "es"
          ? "Español"
          : lang === "zh-CN"
            ? "简体中文"
            : lang === "zh-TW"
              ? "繁體中文"
              : lang}
    </span>
  );
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("settings.ui.language.title")}</FormLabel>
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
              <FormDescription>
                {t("settings.ui.language.description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("settings.ui.theme.title")}</FormLabel>
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
                        placeholder={t("settings.ui.theme.select-placeholder")}
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
              <FormDescription>
                {t("settings.ui.theme.description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function WalletSummary({
  name,
  wallet,
  event,
  showControls = false,
  isDefault = false,
}: {
  name: string;
  wallet: ChachiWallet;
  event?: NostrEvent;
  showControls?: boolean;
  isDefault?: boolean;
}) {
  const { t } = useTranslation();
  const ndkWallet = useWallet();
  const [, setDefaultWallet] = useDefaultWallet();
  const { relays, pubkey, lud16 } = useMemo(() => {
    if (wallet.type === "nwc") {
      const u = new URL(wallet.connection);
      const pubkey = u.host ?? u.pathname;
      const relays = u.searchParams.getAll("relay");
      const lud16 = u.searchParams.get("lud16");
      return { relays, pubkey, lud16 };
    }
    return {};
  }, []);

  function removeWallet() {
    if (isDefault) {
      setDefaultWallet(null);
    }
  }

  function makeDefault(wallet: ChachiWallet) {
    setDefaultWallet(wallet);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-row justify-between">
          <div className="flex flex-row items-center gap-1.5">
            {wallet.type === "nip60" ? (
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
            ) : (
              <span className="">{name}</span>
            )}
          </div>
          {wallet.type === "nwc" &&
          isDefault &&
          ndkWallet instanceof NDKNWCWallet ? (
            <NWCWalletBalanceAmount
              wallet={ndkWallet}
              classNames={{ icon: "size-5", text: "text-xl font-light" }}
            />
          ) : wallet.type === "nip60" &&
            isDefault &&
            ndkWallet instanceof NDKCashuWallet ? (
            <CashuWalletBalanceAmount
              wallet={ndkWallet}
              classNames={{ icon: "size-5", text: "text-xl font-light" }}
            />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {wallet.type === "nip60" && event ? (
          <MintList
            mints={event.tags.filter((t) => t[0] === "mint")?.map((t) => t[1])}
          />
        ) : null}
        {wallet.type === "nwc" ? (
          <div className="flex flex-col gap-2">
            {lud16 ? (
              <div className="flex flex-row gap-1 items-center">
                <ZapIcon className="size-4 text-muted-foreground" />
                <span className="text-sm">{lud16}</span>
              </div>
            ) : null}
            <InputCopy value={wallet.connection} />
            {relays ? <RelayList relays={relays} /> : null}
          </div>
        ) : null}
      </CardContent>
      {showControls ? (
        <CardFooter className="flex justify-end">
          <div className="flex flex-row gap-2 items-center justify-between">
            <Button
              onClick={removeWallet}
              variant="destructive"
              className="w-full"
              size="sm"
            >
              {t("settings.wallet.wallets.remove")}
            </Button>
            {isDefault ? null : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => makeDefault(wallet)}
              >
                {t("settings.wallet.wallets.make-default")}
              </Button>
            )}
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function RelayList({ relays }: { relays: string[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
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

function MintList({ mints }: { mints: string[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-1 items-center flex-wrap">
        <Landmark className="size-4 text-muted-foreground" />
        <h4 className="text-sm uppercase font-light text-muted-foreground">
          {t("settings.wallet.mints")}
        </h4>
      </div>
      <div className="flex flex-col gap-0.5">
        {mints.map((t) => (
          <div key={t} className="flex flex-row items-center gap-1">
            <MintIcon url={t} className="size-4" />
            <MintName url={t} className="text-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Wallet() {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [defaultWallet] = useDefaultWallet();
  const { data: cashuWallet } = useNutsack();
  console.log("NUTSACK", cashuWallet);
  return (
    <div className="flex flex-col gap-4">
      {defaultWallet && wallet ? (
        <div className="flex flex-col gap-2">
          <WalletSummary
            key={wallet.walletId}
            name={wallet.walletId}
            wallet={defaultWallet}
            event={
              wallet instanceof NDKCashuWallet
                ? (wallet.event?.rawEvent() as NostrEvent)
                : undefined
            }
            showControls
            isDefault
          />
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">
          {t("settings.wallet.default-wallet.none")}
        </span>
      )}
      <div className="flex flex-col gap-2">
        <ConnectWallet />
        {cashuWallet ? null : <CreateWallet />}
      </div>
    </div>
  );
}
