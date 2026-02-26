import {
  HandHeart,
  Settings as SettingsIcon,
  SunMoon,
  Wallet as WalletIcon,
  CloudUpload,
  VenetianMask,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TabContainer, TabItem } from "@/components/ui/tab-container";
import { NameList } from "@/components/nostr/name-list";
import { Appearance, Media, Privacy } from "@/components/settings";
import { Header } from "@/components/header";
import { useSupporters } from "@/lib/nostr/zaps";
import { OPENSATS_PUBKEY, CHACHI_PUBKEY, CHACHI_RELAYS } from "@/constants";
import { User } from "@/components/nostr/user";
import { Donate } from "@/components/donate";
import Amount from "@/components/amount";

export default function Settings() {
  const { t } = useTranslation();
  const supporters = useSupporters(CHACHI_PUBKEY, CHACHI_RELAYS, {
    waitForEose: false,
  });

  const tabs: TabItem[] = [
    {
      id: "ui",
      name: t("settings.ui.title"),
      icon: <SunMoon className="size-4 text-muted-foreground" />,
      children: (
        <div className="flex flex-col gap-6 w-full">
          <Appearance />
          <hr />
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 mb-2">
              <div className="flex flex-row items-center gap-1">
                <HandHeart className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-light uppercase text-muted-foreground">
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
                    avatar: "size-5",
                    name: "text-md font-normal hover:underline hover:decoration-dotted",
                  }}
                  clickAction="link"
                />
                <Amount amount={21_000} currency="USD" />
              </div>
              {supporters.slice(0, 3).map(([pk, amount]) => (
                <div
                  key={pk}
                  className="flex flex-row items-center justify-between"
                >
                  <User
                    pubkey={pk}
                    classNames={{
                      avatar: "size-5",
                      name: "font-normal text-md hover:underline hover:decoration-dotted",
                    }}
                    clickAction="link"
                  />
                  <Amount amount={amount} currency="sat" />
                </div>
              ))}
              {supporters.length > 3 ? (
                <div
                  key="rest-of-supporters"
                  className="flex flex-row items-center justify-between"
                >
                  <NameList
                    pubkeys={supporters.slice(3).map(([pk]) => pk)}
                    textClassName="font-normal text-md"
                    userClassnames={{
                      avatar: "size-5",
                      name: "font-normal text-md hover:underline hover:decoration-dotted",
                    }}
                  />
                  <Amount
                    amount={supporters
                      .slice(3)
                      .reduce((acc, [, input]) => acc + input, 0)}
                    currency="sat"
                  />
                </div>
              ) : null}
            </div>
          </div>
          <Donate size="sm" variant="secondary" />
        </div>
      ),
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
