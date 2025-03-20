import type { ReactNode } from "react";
import {
  Settings as SettingsIcon,
  SunMoon,
  Wallet as WalletIcon,
  CloudUpload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Appearance, Wallet, Media } from "@/components/settings";
import { Header } from "@/components/header";

type Tab = "wallet" | "ui" | "media";

interface TabSpec {
  text: string;
  icon: ReactNode;
}

const tabs: Tab[] = ["ui", "wallet", "media"];

export default function Settings() {
  const { t } = useTranslation();
  const tabConfig: Record<Tab, TabSpec> = {
    ui: {
      text: t("settings.ui.title"),
      icon: <SunMoon className="size-4 text-muted-foreground" />,
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
        <Tabs defaultValue="ui">
          <TabsList>
            {tabs.map((tab) => {
              const { icon, text } = tabConfig[tab];
              return (
                <TabsTrigger key={tab} value={tab}>
                  <div className="flex flex-row items-center gap-2">
                    {icon}
                    <span>{text}</span>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value="ui" className="max-w-96">
            <Appearance />
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
