import {
  Settings as SettingsIcon,
  SunMoon,
  CloudUpload,
  VenetianMask,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TabContainer, TabItem } from "@/components/ui/tab-container";
import { Appearance, Media, Privacy } from "@/components/settings";
import { Header } from "@/components/header";

export default function Settings() {
  const { t } = useTranslation();

  const tabs: TabItem[] = [
    {
      id: "ui",
      name: t("settings.ui.title"),
      icon: <SunMoon className="size-4 text-muted-foreground" />,
      children: <Appearance />,
    },
    {
      id: "media",
      name: t("settings.media.title"),
      icon: <CloudUpload className="size-4 text-muted-foreground" />,
      children: <Media />,
    },
    {
      id: "privacy",
      name: t("settings.privacy.title"),
      icon: <VenetianMask className="size-4 text-muted-foreground" />,
      children: <Privacy />,
    },
  ];

  return (
    <div>
      <Header>
        <div className="flex flex-row items-center gap-1.5">
          <SettingsIcon className="size-5 text-muted-foreground" />
          <h1>{t("settings.title")}</h1>
        </div>
      </Header>
      <div className="p-2 sm:pl-12">
        <TabContainer tabs={tabs} defaultTab="ui" contentClassName="max-w-96" />
      </div>
    </div>
  );
}
