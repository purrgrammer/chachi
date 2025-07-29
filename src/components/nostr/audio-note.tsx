import { useMemo } from "react";
import type { NostrEvent } from "nostr-tools";
import { parseImeta } from "@/lib/media";
import { Audio } from "@/components/audio";

export default function AudioNote({ event }: { event: NostrEvent }) {
  const imetaTag = event.tags.find((t) => t[0] === "imeta");
  const imeta = useMemo(
    () => (imetaTag ? parseImeta(imetaTag.slice(1)) : null),
    [imetaTag],
  );
  return (
    <Audio url={imeta?.url ? imeta.url : event.content} className="min-w-56" />
  );
}
