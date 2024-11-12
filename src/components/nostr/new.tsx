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
//import { CreateGroup } from "@/components/nostr/groups/create";
import { NewPost } from "@/components/new-post";
import { useCanSign } from "@/lib/account";
import { useNDK } from "@/lib/ndk";
import { Button } from "@/components/ui/button";
import { getRelayHost } from "@/lib/relay";
import type { Group } from "@/lib/types";

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

export function New({ group }: { group: Group }) {
  //const { data: relayInfo } = useRelayInfo(group.relay);
  //const supportsNip29 = relayInfo?.supported_nips?.includes(29);
  const ndk = useNDK();
  const [isOpen, setIsOpen] = useState(false);
  const canSign = useCanSign();
  const navigate = useNavigate();
  const contentTypes = [
    { icon: "🧵", title: "Post", component: NewPost },
    { icon: "🗳️", title: "Poll", component: NewPoll },
    //{
    //  icon: "🏰",
    //  title: "Community",
    //  component: supportsNip29 ? CreateGroup : null,
    //},
    //{
    //  icon: "🛡️",
    //  title: "Private group",
    //  component: supportsNip29 ? CreateGroup : null,
    //},
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
      <DrawerTrigger>
        <Button disabled={!canSign} variant="action" size="icon">
          <DiamondPlus />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="flex flex-col sm:max-w-[425px]">
            <DrawerHeader className="text-left self-start">
              <DrawerTitle>Create</DrawerTitle>
              <DrawerDescription>What do you want to create?</DrawerDescription>
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
