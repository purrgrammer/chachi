import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { cn } from "@/lib/utils";

interface UserClassNames {
  wrapper?: string;
  name?: string;
  avatar?: string;
}

interface UserProps {
  pubkey: string;
  classNames?: UserClassNames;
}

export function User({ pubkey, classNames }: UserProps) {
  return (
    <div
      className={cn("flex flex-row items-center gap-2", classNames?.wrapper)}
    >
      <Avatar pubkey={pubkey} className={classNames?.avatar} />
      <span className={cn("text-md font-semibold", classNames?.name)}>
        <Name pubkey={pubkey} />
      </span>
    </div>
  );
}
