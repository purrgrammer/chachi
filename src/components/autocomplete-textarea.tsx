import { useEffect, useRef, useState, useMemo, KeyboardEvent } from "react";
import { Crown, Reply as ReplyIcon, X } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { motion, AnimatePresence } from "framer-motion";
import { npubEncode } from "nostr-tools/nip19";
import { Avatar } from "@/components/nostr/avatar";
import { Autocomplete } from "@/components/autocomplete";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Name } from "@/components/nostr/name";
import { useProfiles } from "@/lib/nostr";
import { useCustomEmojis } from "@/lib/nostr/emojis";
import { useGroupAdminsList } from "@/lib/nostr/groups";
import { useMembers } from "@/lib/messages";
import { cn, dedupeBy } from "@/lib/utils";
import { Highlight } from "@/components/highlight";
import { usePubkey } from "@/lib/account";
import { emojis } from "@/lib/emoji";
import type { Group, Emoji, Profile } from "@/lib/types";

const TAB = 9;

// todo: ignore url prefixes to `:`: http, https, ws, wss
const autocompleteRegex = /@\S*$/;
const emojiAutocompleteRegex = /(?<!(https?|nostr|wss?)):\S*$/;

function ReplyPreview({
  topOffset = 8,
  width,
  reply,
  setReplyingTo,
}: {
  topOffset?: number;
  width: number;
  reply: NostrEvent;
  setReplyingTo?: (event: NostrEvent | null) => void;
}) {
  return (
    <motion.div
      initial={{
        height: 0,
        top: 0,
        opacity: 0,
      }}
      animate={{
        height: "32px",
        top: `-${32 - topOffset}px`,
        width: width + 2,
        opacity: 1,
      }}
      exit={{
        height: 0,
        top: 0,
        opacity: 0,
      }}
      className="flex flex-row items-center gap-2 p-1 pl-2 absolute border-l border-t border-r rounded-t-lg outline-none ring-1 ring-ring left-2 right-2 h-8 bg-background"
    >
      <div className="w-5">
        <ReplyIcon className="w-4 h-4 text-muted-foreground" />
      </div>
      <h4 className="font-semibold text-sm">
        <Name pubkey={reply.pubkey} />
      </h4>
      <p className="line-clamp-1">{reply.content}</p>
      <div className="w-7">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 w-5 h-5"
          onClick={() => setReplyingTo?.(null)}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </motion.div>
  );
}

interface AutocompleteTextareaProps extends TextareaProps {
  group: Group;
  className?: string;
  topOffset?: number;
  message: string;
  setMessage: (msg: string) => void;
  onFinish(msg: string, emojis: Emoji[]): void;
  onCustomEmojisChange?: (emojis: Emoji[]) => void;
  reply?: NostrEvent;
  setReplyingTo?: (event: NostrEvent | null) => void;
  submitOnEnter?: boolean;
}

export function AutocompleteTextarea({
  group,
  className,
  topOffset = 5,
  message,
  setMessage,
  onFinish,
  onCustomEmojisChange,
  reply,
  setReplyingTo,
  submitOnEnter,
  ...props
}: AutocompleteTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const {data: adminList }= useGroupAdminsList(group);
  const admins = adminList || [];
  const members = useMembers(group);
  const me = usePubkey();

  // Emojis
  const { data: myCustomEmojis } = useCustomEmojis();
  const customEmoji = myCustomEmojis?.map((coll) => coll.emojis).flat() || [];
  const allEmojis = useMemo(() => {
    return dedupeBy((customEmoji as Emoji[]).concat(emojis), "name");
  }, [myCustomEmojis]);
  const [customEmojis, setCustomEmojis] = useState<Emoji[]>([]);

  // autocomplete
  const [isAutocompleting, setIsAutocompleting] = useState(false);
  const [isAutocompletingEmoji, setIsAutocompletingEmoji] = useState(false);

  const [autocompleteTerm, setAutocompleteTerm] = useState("");
  const [autocompleteEmojiTerm, setAutocompleteEmojiTerm] = useState("");

  const profiles = useProfiles(members ?? []);
  const profileList = profiles.map((p) => p.data).filter(Boolean);
  const autocompleteProfiles =
    autocompleteTerm && isAutocompleting
      ? profileList
          .filter((p: Profile) => {
            return (
              p.pubkey !== me &&
              p.name?.toLowerCase().includes(autocompleteTerm.toLowerCase())
            );
          })
          .sort((a: Profile, b: Profile) => {
            if (admins.includes(a.pubkey)) return -1;
            if (admins.includes(b.pubkey)) return 1;
            if (
              a.name?.toLowerCase().startsWith(autocompleteTerm.toLowerCase())
            )
              return -1;
            if (
              b.name?.toLowerCase().startsWith(autocompleteTerm.toLowerCase())
            )
              return 1;
            return 0;
          })
      : profileList
          .filter((p) => p.pubkey !== me)
          .sort((a: Profile, b: Profile) => {
            if (admins.includes(a.pubkey)) return -1;
            if (admins.includes(b.pubkey)) return 1;
            if (
              (a.name || a.display_name || a.pubkey) <
              (b.name || b.display_name || b.pubkey)
            )
              return -1;
            if (
              (b.name || b.display_name || b.pubkey) <
              (a.name || a.display_name || a.pubkey)
            )
              return 1;
            return 0;
          });
  const autocompleteEmojis = (
    autocompleteEmojiTerm && isAutocompletingEmoji
      ? allEmojis.filter((e) =>
          e.name.toLowerCase().includes(autocompleteEmojiTerm.toLowerCase()),
        )
      : allEmojis
  ).slice(0, 21);

  function autocompleteEmoji(e: Emoji) {
    if (e.native) {
      setMessage(message.replace(emojiAutocompleteRegex, `${e.native} `));
    } else if (e.image) {
      setMessage(message.replace(emojiAutocompleteRegex, `:${e.name}: `));
      setCustomEmojis([...customEmojis, e]);
      onCustomEmojisChange?.([...customEmojis, e]);
    }
    setIsAutocompletingEmoji(false);
    setAutocompleteEmojiTerm("");
    ref.current?.focus();
  }

  function autocompleteProfile(p: Profile) {
    // todo: nprofile if possible
    setMessage(
      message.replace(autocompleteRegex, `nostr:${npubEncode(p.pubkey)} `),
    );
    setIsAutocompleting(false);
    setIsAutocompletingEmoji(false);
    setAutocompleteTerm("");
    setAutocompleteEmojiTerm("");
    ref.current?.focus();
  }

  async function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      e.keyCode === TAB &&
      isAutocompleting &&
      autocompleteProfiles.length === 1
    ) {
      e.preventDefault();
      autocompleteProfile(autocompleteProfiles[0]);
    } else if (
      e.keyCode === TAB &&
      isAutocompletingEmoji &&
      autocompleteEmojis.length === 1
    ) {
      e.preventDefault();
      autocompleteEmoji(autocompleteEmojis[0]);
    } else if (e.key === "Escape") {
      ref.current?.blur();
      setIsAutocompleting(false);
      setIsAutocompletingEmoji(false);
      setAutocompleteTerm("");
      setAutocompleteEmojiTerm("");
      setReplyingTo?.(null);
    } else if (e.key === "Enter" && !e.shiftKey && submitOnEnter) {
      e.preventDefault();
      onFinish(message, dedupeBy(customEmojis, "name"));
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    if (autocompleteRegex.test(value)) {
      const term = value.slice(value.lastIndexOf("@") + 1);
      setAutocompleteTerm(term);
      setIsAutocompleting(true);
      setAutocompleteEmojiTerm("");
      setIsAutocompletingEmoji(false);
    } else if (emojiAutocompleteRegex.test(value)) {
      setAutocompleteTerm("");
      setIsAutocompleting(false);
      const term = value.slice(value.lastIndexOf(":") + 1);
      setAutocompleteEmojiTerm(term);
      setIsAutocompletingEmoji(true);
    } else {
      setIsAutocompleting(false);
      setAutocompleteTerm("");
      setIsAutocompletingEmoji(false);
      setAutocompleteEmojiTerm("");
    }
    if (value.length === 0) {
      setCustomEmojis([]);
      onCustomEmojisChange?.([]);
    }
    setMessage(value);
  }

  useEffect(() => {
    if (reply) {
      setTimeout(() => {
        ref.current?.focus();
      }, 100);
    }
  }, [reply]);

  return (
    <div className="w-full p-2 relative transition-height">
      <Textarea
        ref={ref}
        className={cn(
          `text-md focus-visible:outline-none focus:ring-ring focus-visible:ring-ring w-full p-1 px-3 resize-none ${isAutocompleting || isAutocompletingEmoji || reply ? "rounded-b-xl rounded-t-none ring ring-ring ring-1" : "rounded-xl"}`,
          className,
        )}
        minRows={1}
        maxRows={3}
        value={message}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        {...props}
      />
      <AnimatePresence>
        {reply ? (
          <ReplyPreview
            width={ref.current?.clientWidth ?? 0}
            reply={reply}
            setReplyingTo={setReplyingTo}
          />
        ) : null}
        {isAutocompletingEmoji && (
          <Autocomplete
            topOffset={topOffset}
            width={ref.current?.clientWidth ?? 0}
            items={autocompleteEmojis}
            onSelect={autocompleteEmoji}
            getKey={(e: Emoji) => e.name}
            renderItem={(e: Emoji) => {
              return (
                <div className="flex flex-row items-center gap-2 ">
                  {e.native ? (
                    <span className="text-md">{e.native}</span>
                  ) : (
                    <img src={e.image} className="w-5 h-5" />
                  )}
                  <span className="text-md">
                    <Highlight
                      text={e.name}
                      highlight={autocompleteEmojiTerm}
                    />
                  </span>
                </div>
              );
            }}
          />
        )}
        {isAutocompleting ? (
          <Autocomplete
            topOffset={topOffset}
            width={ref.current?.clientWidth ?? 0}
            items={autocompleteProfiles}
            onSelect={autocompleteProfile}
            getKey={(item: Profile) => item.pubkey}
            renderItem={(p: Profile) => {
              return (
                <div className="flex flex-row items-center gap-2 ">
                  <Avatar pubkey={p.pubkey} className="size-5" />
                  <div className="flex flex-row items-center gap-1">
                    <span className="text-md">
                      <Highlight
                        text={p.name || p.display_name || p.pubkey}
                        highlight={autocompleteTerm}
                      />
                    </span>
                    {admins.includes(p.pubkey) ? (
                      <Crown className="w-3 h-3" />
                    ) : null}
                  </div>
                </div>
              );
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
