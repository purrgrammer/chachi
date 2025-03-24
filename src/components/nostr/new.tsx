import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NostrEvent } from "nostr-tools";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { DiamondPlus } from "lucide-react";
import { NewPoll } from "@/components/nostr/new-poll";
import { NewPost } from "@/components/new-post";
import { NewVideo } from "@/components/nostr/video";
import { NewImage } from "@/components/nostr/image";
import { useCanSign } from "@/lib/account";
import { useNDK } from "@/lib/ndk";
import { Button } from "@/components/ui/button";
import { getRelayHost } from "@/lib/relay";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

interface ContentProps {
  group: Group;
  onSuccess?: (ev: NostrEvent) => void;
  children?: React.ReactNode;
}

// todo: community, private group
interface ContentType {
  icon: string;
  title: string;
  component?: React.ComponentType<ContentProps>;
}

// todo: share chat step
export function New({ group }: { group: Group }) {
  //const { data: relayInfo } = useRelayInfo(group.relay);
  //const supportsNip29 = relayInfo?.supported_nips?.includes(29);
  const ndk = useNDK();
  const [isOpen, setIsOpen] = useState(false);
  const canSign = useCanSign();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const contentTypes = [
    { icon: "🧵", title: t("content.type.post"), component: NewPost },
    { icon: "🗳️", title: t("content.type.poll"), component: NewPoll },
    { icon: "📷", title: t("content.type.image"), component: NewImage },
    { icon: "🎥", title: t("content.type.video"), component: NewVideo },
  ];

  function onSuccess(ev: NostrEvent) {
    setIsOpen(false);
    const ndkEvent = new NDKEvent(ndk, ev);
    // @ts-expect-error for some reason it thinks this function takes a number
    const nlink = ndkEvent.encode([group.relay]);
    if (group.id === "_") {
      navigate(`/${getRelayHost(group.relay)}/e/${nlink}`);
    } else {
      navigate(`/${getRelayHost(group.relay)}/${group.id}/e/${nlink}`);
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button disabled={!canSign} variant="action" size="icon">
          <DiamondPlus />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="flex flex-col justify-center items-center py-6">
          <div className="flex flex-col sm:max-w-[425px]">
            <DrawerHeader className="self-start text-left">
              <DrawerTitle>{t("content.create")}</DrawerTitle>
              <DrawerDescription>{t("content.prompt")}</DrawerDescription>
            </DrawerHeader>
            <div className="grid grid-cols-2 gap-2">
              {contentTypes.map((contentType: ContentType) => {
                return contentType.component ? (
                  <contentType.component
                    key={contentType.title}
                    group={group}
                    onSuccess={onSuccess}
                  >
                    <Button variant="outline" size="huge">
                      <div className="flex flex-col gap-2">
                        <span className="text-5xl">{contentType.icon}</span>
                        <span className="text-lg">{contentType.title}</span>
                      </div>
                    </Button>
                  </contentType.component>
                ) : (
                  <Button
                    disabled={!contentType.component}
                    key={contentType.title}
                    variant="outline"
                    size="huge"
                  >
                    <div className="flex flex-col gap-2">
                      <span className="text-5xl">{contentType.icon}</span>
                      <span className="text-md">{contentType.title}</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
