import { useProfiles } from "@/lib/nostr";
import { Name } from "@/components/nostr/name";
import { Avatar } from "@/components/nostr/avatar";

export function NameList({
  pubkeys,
  suffix,
}: {
  pubkeys: string[];
  suffix?: string;
}) {
  const q = useProfiles(pubkeys);
  const profiles = q.map((q) => q.data).filter(Boolean);
  const deduped = Array.from(new Set(profiles.map((p) => p.pubkey)));
  return (
    <div className="flex items-center gap-1">
      {deduped.map((pubkey, idx) => (
        <>
          <span key={pubkey} className="flex items-center">
            <Avatar pubkey={pubkey} className="size-3 mr-1 inline-block" />
            <span className="font-semibold">
              <Name key={pubkey} pubkey={pubkey} />
            </span>
          </span>
          {idx < deduped.length - 2 ? (
            <span>, </span>
          ) : idx === deduped.length - 2 ? (
            <span> and </span>
          ) : null}
          {idx === deduped.length - 1 ? <span>{suffix}</span> : null}
        </>
      ))}
    </div>
  );
}
