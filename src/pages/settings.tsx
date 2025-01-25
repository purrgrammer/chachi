import type { ReactNode } from "react";
import {
  Settings as SettingsIcon,
  SunMoon,
  Wallet as WalletIcon,
  HardDriveUpload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UI, Wallet } from "@/components/settings";
import { Header } from "@/components/header";

type Tab = "wallet" | "ui" | "media";// | "relays";

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
      icon: <HardDriveUpload className="size-4 text-muted-foreground" />,
    },
    //relays: {
    //  text: t("settings.relays.title"),
    //  icon: <Server className="size-4 text-muted-foreground" />,
    //},
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
                <TabsTrigger value={tab}>
                  <div className="flex flex-row items-center gap-2">
                    {icon}
                    <span>{text}</span>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value="ui" className="max-w-96">
            <UI />
          </TabsContent>
          <TabsContent value="wallet" className="max-w-96">
            <Wallet />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
