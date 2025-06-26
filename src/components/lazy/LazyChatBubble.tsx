import { lazy, Suspense } from "react";
import { Loading } from "@/components/loading";
import type { NostrEvent } from "nostr-tools";
import type { Group } from "@/lib/types";

const ChatBubble = lazy(() =>
  import("@/components/nostr/chat-bubble").then((module) => ({
    default: module.ChatBubble,
  })),
);

const ChatBubbleDetail = lazy(() =>
  import("@/components/nostr/chat-bubble").then((module) => ({
    default: module.ChatBubbleDetail,
  })),
);

interface LazyChatBubbleProps {
  event: NostrEvent;
  group?: Group;
  showReply?: boolean;
  showRootReply?: boolean;
  showReactions?: boolean;
}

export function LazyChatBubble(props: LazyChatBubbleProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ChatBubble {...props} />
    </Suspense>
  );
}

export function LazyChatBubbleDetail(props: LazyChatBubbleProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ChatBubbleDetail {...props} />
    </Suspense>
  );
}
