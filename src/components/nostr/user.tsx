import { Link } from "react-router-dom";
import { nip19 } from "nostr-tools";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { ProfileDrawer } from "@/components/nostr/profile";
import { cn } from "@/lib/utils";

interface UserClassNames {
  wrapper?: string;
  name?: string;
  avatar?: string;
}

interface UserProps {
  pubkey: string;
  classNames?: UserClassNames;
  relays?: string[];
  notClickable?: boolean;
  clickAction?: "drawer" | "link";
}

export function User({
  pubkey,
  classNames,
  relays,
  notClickable,
  clickAction = "drawer",
}: UserProps) {
  const user = (
    <div
      className={cn("flex flex-row items-center gap-2", classNames?.wrapper)}
    >
      <Avatar pubkey={pubkey} relays={relays} className={classNames?.avatar} />
      <span className={cn("text-md font-semibold", classNames?.name)}>
        <Name relays={relays} pubkey={pubkey} />
      </span>
    </div>
  );
  return notClickable ? (
    user
  ) : clickAction === "drawer" ? (
    <ProfileDrawer trigger={user} pubkey={pubkey} />
  ) : (
    <Link to={`/p/${nip19.nprofileEncode({ pubkey, relays })}`}>{user}</Link>
  );
}
