import { useTranslation } from "react-i18next";
import { Forward } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { SimpleText } from "@/components/simple-text";
import type { Group } from "@/lib/types";

// Lightweight testimonial component specifically for landing page
// Avoids importing the heavy ChatMessage component and its dependencies

interface TestimonialBubbleProps {
  event: NostrEvent;
  group?: Group;
  avatarSide?: "left" | "right";
}

export function TestimonialBubble({
  event,
  group,
  avatarSide = "left",
}: TestimonialBubbleProps) {
  const { t } = useTranslation();
  const author = event.pubkey;
  const content = event.content.trim();
  const groupTag = event.tags.find((t) => t[0] === "h");
  const [, id, relay] = groupTag ? groupTag : [];
  const chatGroup = { id, relay };
  const isForwarded =
    chatGroup.id &&
    chatGroup.relay &&
    (!group || group.id !== chatGroup.id || group.relay !== chatGroup.relay);

  return (
    <div className="flex flex-col gap-0.5">
      {isForwarded ? (
        <div className="flex flex-row gap-1 items-center text-muted-foreground ml-9">
          <Forward className="size-4" />
          <span className="text-xs">{t("chat.message.forward.forwarded")}</span>
        </div>
      ) : null}

      <div
        className={`flex gap-2 items-end mb-2 ${avatarSide === "right" ? "flex-row-reverse" : "flex-row"}`}
      >
        <Avatar pubkey={author} className="size-7" />

        <div className="flex flex-row gap-2 items-center">
          <div
            className={`p-1 px-2 w-fit max-w-[18rem] sm:max-w-sm md:max-w-md bg-secondary text-secondary-foreground ${
              avatarSide === "right"
                ? "rounded-tl-lg rounded-tr-lg rounded-bl-lg"
                : "rounded-tl-lg rounded-tr-lg rounded-br-lg"
            }`}
          >
            <div className="flex flex-row gap-1 items-center">
              <h3 className="text-sm font-semibold">
                <Name pubkey={author} />
              </h3>
            </div>

            {/* Simple content rendering without rich-text dependencies */}
            <SimpleText maxLength={200}>{content}</SimpleText>
          </div>
        </div>
      </div>
    </div>
  );
}
