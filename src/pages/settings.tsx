import { useState } from "react";
import type { ReactNode } from "react";
import {
  HandHeart,
  Settings as SettingsIcon,
  SunMoon,
  Wallet as WalletIcon,
  CloudUpload,
  VenetianMask,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Appearance, Wallet, Media, Privacy } from "@/components/settings";
import { Header } from "@/components/header";
import { useSupporters } from "@/components/supporters";
import { OPENSATS_PUBKEY, CHACHI_PUBKEY, CHACHI_RELAYS } from "@/constants";
import { User } from "@/components/nostr/user";
import { Donate } from "@/components/donate";
import Amount from "@/components/amount";

type Tab = "wallet" | "ui" | "privacy" | "media";

interface TabSpec {
  text: string;
  icon: ReactNode;
}

const tabs: Tab[] = ["ui", "wallet", "media", "privacy"];

export default function Settings() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("ui");
  const supporters = useSupporters(CHACHI_PUBKEY, CHACHI_RELAYS);
  const tabConfig: Record<Tab, TabSpec> = {
    ui: {
      text: t("settings.ui.title"),
      icon: <SunMoon className="size-4 text-muted-foreground" />,
    },
    privacy: {
      text: t("settings.privacy.title"),
      icon: <VenetianMask className="size-4 text-muted-foreground" />,
    },
    wallet: {
      text: t("settings.wallet.title"),
      icon: <WalletIcon className="size-4 text-muted-foreground" />,
    },
    media: {
      text: t("settings.media.title"),
      icon: <CloudUpload className="size-4 text-muted-foreground" />,
    },
  };

  return (
    <div>
      <Header>
        <div className="flex flex-row items-center gap-1.5">
          <SettingsIcon className="size-5 text-muted-foreground" />
          <h1>{t("settings.title")}</h1>
        </div>
      </Header>
      <div className="p-2 sm:pl-12">
        <Tabs
          defaultValue={tab}
          onValueChange={(value) => setTab(value as Tab)}
        >
          <TabsList>
            {tabs.map((t) => {
              const { icon, text } = tabConfig[t];
              return (
                <TabsTrigger key={t} value={t}>
                  <div className="flex flex-row items-center gap-2">
                    {icon}
                    <span
                      className={
                        t === tab ? "visible transition-all" : "hidden sm:block"
                      }
                    >
                      {text}
                    </span>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value="ui" className="max-w-96">
            <div className="flex flex-col gap-6 w-full">
              <Appearance />
              <hr />
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-0 mb-2">
                  <div className="flex flex-row items-center gap-1">
                    <HandHeart className="size-4 text-muted-foreground" />
                    <h2 className="text-md font-light uppercase text-muted-foreground">
                      {t("settings.supporters.title", "Supporters")}
                    </h2>
                  </div>
                  <p className="text-xs leading-tight">
                    {t("user.support-chachi-description")}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    key="opensats-grant"
                    className="flex flex-row items-center justify-between"
                  >
                    <User
                      pubkey={OPENSATS_PUBKEY}
                      classNames={{
                        avatar: "size-6",
                        name: "text-lg font-normal hover:underline hover:decoration-dotted",
                      }}
                      clickAction="link"
                    />
                    <Amount amount={21_000} currency="USD" />
                  </div>
                  {supporters.map(([pk, amount]) => (
                    <div
                      key={pk}
                      className="flex flex-row items-center justify-between"
                    >
                      <User
                        pubkey={pk}
                        classNames={{
                          avatar: "size-6",
                          name: "font-normal text-lg hover:underline hover:decoration-dotted",
                        }}
                        clickAction="link"
                      />
                      <Amount amount={amount} currency="sat" />
                    </div>
                  ))}
                </div>
              </div>
              <Donate />
            </div>
          </TabsContent>
          <TabsContent value="privacy" className="max-w-96">
            <Privacy />
          </TabsContent>
          <TabsContent value="wallet" className="max-w-96">
            <Wallet />
          </TabsContent>
          <TabsContent value="media" className="max-w-96">
            <Media />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
