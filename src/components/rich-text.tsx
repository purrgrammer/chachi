import { useMemo } from "react";
import { nip19 } from "nostr-tools";
import type {
  AddressPointer,
  EventPointer,
  ProfilePointer,
} from "nostr-tools/nip19";
import { Event } from "@/components/nostr/event";
import { Address } from "@/components/nostr/address";
import { Image } from "@/components/image";
import { Audio } from "@/components/audio";
import { Video } from "@/components/video";
import { CashuToken } from "@/components/cashu";
import { Mention } from "@/components/nostr/mention";
import { Emoji } from "@/components/emoji";
import { Hashtag } from "@/components/hashtag";
import { youtubeUrlRegex, YoutubeEmbed } from "@/components/youtube";
import { isImageLink, isVideoLink, isAudioLink } from "@/lib/string";
import type { Group } from "@/lib/types";
import { cn } from "@/lib/utils";

// todo: blossom link fallbacks

const urlRegex =
  /((?:http|https?):\/?\/?(?:[\w+?.\w+])+(?:[\p{L}\p{N}~!@#$%^&*()_\-=+\\/?.:;',]*)?(?:[-a-z0-9+&@#/%=~()_|]))/iu;

const NostrPrefixRegex = /^nostr:/;

export type TextFragment = {
  type: "text";
  text: string;
};

export type MentionFragment = {
  type: "mention";
  pubkey: string;
  relays: string[];
};

export type EventFragment = {
  type: "event";
  id: string;
  kind?: number;
  relays: string[];
};

export type AddressFragment = {
  type: "address";
  kind: number;
  pubkey: string;
  identifier: string;
  relays: string[];
};

export type URLFragment = {
  type: "url";
  url: string;
};

export type VideoFragment = {
  type: "video";
  url: string;
};

export type YoutubeFragment = {
  type: "youtube";
  url: string;
};

export type ImageFragment = {
  type: "image";
  url: string;
};

export type AudioFragment = {
  type: "audio";
  url: string;
};

export type EmojiFragment = {
  type: "emoji";
  name: string;
  image: string;
  //todo: emoji collection
  //collection?: string;
};

export type HashtagFragment = {
  type: "hashtag";
  tag: string;
};

export type EcashFragment = {
  type: "ecash";
  token: string;
};

// fixme: event/address as block?

export type InlineFragment =
  | TextFragment
  | MentionFragment
  | EventFragment
  | AddressFragment
  | URLFragment
  | VideoFragment
  | YoutubeFragment
  | ImageFragment
  | AudioFragment
  | EmojiFragment
  | HashtagFragment
  | EcashFragment;

export type BlockFragment = {
  type: "block";
  nodes: InlineFragment[];
};

export type Fragment = BlockFragment | InlineFragment;

function isRenderedAsBlock(fragment: Fragment): boolean {
  return (
    fragment.type === "block" ||
    fragment.type === "event" ||
    fragment.type === "address" ||
    fragment.type === "ecash" ||
    fragment.type === "video" ||
    fragment.type === "youtube" ||
    fragment.type === "image" ||
    fragment.type === "audio"
  );
}

function toNode(
  fragment: Fragment,
  idx: number,
  classNames: RichTextClassnames,
  group: Group,
) {
  if (fragment.type === "mention") {
    return (
      <Mention
        key={fragment.pubkey}
        pubkey={fragment.pubkey}
        relays={fragment.relays}
        className={classNames.mentions}
      />
    );
  }

  if (fragment.type === "emoji") {
    return (
      <Emoji
        key={idx}
        name={fragment.name}
        image={fragment.image}
        className={classNames.emojis}
      />
    );
  }

  if (fragment.type === "hashtag") {
    return (
      <Hashtag
        key={fragment.tag}
        className={cn("font-semibold text-highlight", classNames.hashtags)}
        tag={fragment.tag}
      />
    );
  }

  if (fragment.type === "event") {
    return (
      <Event
        key={fragment.id}
        id={fragment.id}
        group={group}
        relays={fragment.relays}
        className={classNames.events}
      />
    );
  }

  if (fragment.type === "video") {
    return <Video url={fragment.url} className={classNames.video} />;
  }

  if (fragment.type === "audio") {
    return <Audio url={fragment.url} className={classNames.audio} />;
  }

  if (fragment.type === "image") {
    return (
      <Image url={fragment.url} className={cn("my-1", classNames.image)} />
    );
  }

  if (fragment.type === "youtube") {
    return <YoutubeEmbed url={fragment.url} className={classNames.youtube} />;
  }

  if (fragment.type === "url") {
    return (
      <a
        href={fragment.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("underline decoration-dotted", classNames.urls)}
      >
        {fragment.url}
      </a>
    );
  }

  if (fragment.type === "address") {
    return (
      <Address
        key={`${fragment.kind}:${fragment.pubkey}:${fragment.identifier}`}
        pubkey={fragment.pubkey}
        kind={fragment.kind}
        identifier={fragment.identifier}
        relays={fragment.relays}
        group={group}
        className={classNames.events}
      />
    );
  }

  if (fragment.type === "ecash") {
    return (
      <CashuToken
        key={fragment.token}
        token={fragment.token}
        className={classNames.ecash}
      />
    );
  }

  if (fragment.type === "text") {
    return (
      <span
        key={idx}
        className={`break-words whitespace-pre-wrap text-md leading-tight`}
      >
        {fragment.text}
      </span>
    );
  }

  if (fragment.type === "block") {
    return (
      <p
        key={idx}
        className={cn(
          `break-words whitespace-pre-wrap text-md leading-tight`,
          classNames.paragraphs,
        )}
      >
        {...fragment.nodes.map((f, idx) => toNode(f, idx, classNames, group))}
      </p>
    );
  }

  return null;
}

function toFragments(text: string): Fragment[] {
  return text
    .split(/\n/)
    .filter(Boolean)
    .map((line) => {
      return { type: "block", nodes: [{ type: "text", text: line }] };
    });
}

function extract(
  fragments: Fragment[],
  regexp: RegExp,
  match: (s: string) => boolean,
  parse: (s: string) => Fragment,
): Fragment[] {
  return fragments
    .map((f) => {
      if (f.type === "text") {
        return f.text
          .split(regexp)
          .filter(Boolean)
          .map((s) => {
            if (match(s)) {
              try {
                return parse(s);
              } catch {
                return { type: "text", text: s } as Fragment;
              }
            } else {
              return { type: "text", text: s } as Fragment;
            }
          });
      } else if (f.type === "block") {
        return {
          type: "block",
          nodes: extract(f.nodes, regexp, match, parse),
        } as Fragment;
      }
      return f;
    })
    .flat();
}

function extractMentions(fragments: Fragment[]): Fragment[] {
  return extract(
    fragments,
    /(nostr:npub1[a-z0-9]+)/g,
    (s: string) => s.startsWith("nostr:npub1"),
    (s: string) => {
      const raw = s.replace(NostrPrefixRegex, "");
      const pubkey = nip19.decode(raw).data;
      return { type: "mention", pubkey, relays: [] } as Fragment;
    },
  );
}

function extractProfiles(fragments: Fragment[]): Fragment[] {
  return extract(
    fragments,
    /(nostr:nprofile1[a-z0-9]+)/g,
    (s: string) => s.startsWith("nostr:nprofile1"),
    (s: string) => {
      const raw = s.replace(NostrPrefixRegex, "");
      const { pubkey, relays } = nip19.decode(raw).data as ProfilePointer;
      return { type: "mention", pubkey, relays: relays || [] } as Fragment;
    },
  );
}

function extractNote(fragments: Fragment[]): Fragment[] {
  return extract(
    fragments,
    /(nostr:note1[a-z0-9]+)/g,
    (s: string) => s.startsWith("nostr:note1"),
    (s: string) => {
      const note = s.replace(NostrPrefixRegex, "");
      const id = nip19.decode(note).data;
      return { type: "event", id, relays: [], kind: 1 } as Fragment;
    },
  );
}

function extractNevent(fragments: Fragment[]): Fragment[] {
  return extract(
    fragments,
    /(nostr:nevent1[a-z0-9]+)/g,
    (s: string) => s.startsWith("nostr:nevent1"),
    (s: string) => {
      const nevent = s.replace(NostrPrefixRegex, "");
      const { id, relays, kind } = nip19.decode(nevent).data as EventPointer;
      return { type: "event", id, relays: relays || [], kind } as Fragment;
    },
  );
}

function extractNaddr(fragments: Fragment[]): Fragment[] {
  return extract(
    fragments,
    /(nostr:naddr1[a-z0-9]+)/g,
    (s: string) => s.startsWith("nostr:naddr1"),
    (s: string) => {
      const nevent = s.replace(NostrPrefixRegex, "");
      const { pubkey, identifier, kind, relays } = nip19.decode(nevent)
        .data as AddressPointer;
      return {
        type: "address",
        relays: relays || [],
        pubkey,
        identifier,
        kind: Number(kind),
      } as Fragment;
    },
  );
}

function extractURLs(
  fragments: Fragment[],
  options: RichTextOptions,
): Fragment[] {
  return extract(
    fragments,
    urlRegex,
    (s: string) => {
      try {
        const u = new URL(s);
        return Boolean(u.hostname);
      } catch {
        return false;
      }
    },
    (url: string) => {
      if (isVideoLink(url) && options.video) {
        return { type: "video", url };
      }
      if (isAudioLink(url) && options.audio) {
        return { type: "audio", url };
      }
      if (isImageLink(url) && options.images) {
        return { type: "image", url };
      }
      if (url.match(youtubeUrlRegex) && options.youtube) {
        return { type: "youtube", url };
      }
      return { type: "url", url } as Fragment;
    },
  );
}

const customEmojiRegex = /:([a-zA-Z0-9_-]+):/g;

function extractCustomEmoji(
  fragments: Fragment[],
  tags: string[][],
): Fragment[] {
  return extract(
    fragments,
    customEmojiRegex,
    (name: string) => {
      return Boolean(tags.find((a) => a[0] === "emoji" && a[1] === name));
    },
    (name: string) => {
      const image = tags.find((t) => t[0] === "emoji" && t[1] === name)?.[2];
      if (image) {
        return { type: "emoji", name, image } as Fragment;
      }
      return { type: "text", text: `:${name}:` } as Fragment;
    },
  );
}

const hashtagRegex = /(?<=\s|^)(#[^\s!@#$%^&*()=+./,[{\]};:'"?><]+)/g;

function extractHashtags(fragments: Fragment[]): Fragment[] {
  return extract(
    fragments,
    hashtagRegex,
    (tag: string) => {
      return tag.startsWith("#");
    },
    (tag: string) => {
      return { type: "hashtag", tag: tag.slice(1) } as Fragment;
    },
  );
}

const cashuRegex = /(cashu[A-Za-z0-9_-]{0,10000}={0,3})/i;

function extractEcash(fragments: Fragment[]): Fragment[] {
  return extract(
    fragments,
    cashuRegex,
    (s: string) => {
      return s.includes("cashu");
    },
    (token: string) => {
      return { type: "ecash", token } as Fragment;
    },
  );
}

export interface RichTextOptions {
  inline?: boolean;
  emojis?: boolean;
  mentions?: boolean;
  events?: boolean;
  urls?: boolean;
  hashtags?: boolean;
  ecash?: boolean;
  images?: boolean;
  audio?: boolean;
  video?: boolean;
  youtube?: boolean;
}

export interface RichTextClassnames {
  wrapper?: string;
  emojis?: string;
  singleEmoji?: string;
  mentions?: string;
  events?: string;
  urls?: string;
  hashtags?: string;
  ecash?: string;
  paragraphs?: string;
  video?: string;
  audio?: string;
  image?: string;
  youtube?: string;
}

export function useRichText(
  text: string,
  options: RichTextOptions,
  tags: string[][],
): Fragment[] {
  const fragments = useMemo(() => {
    let result = toFragments(text || "");
    if (options.mentions) {
      result = extractProfiles(extractMentions(result));
    }
    if (options.events) {
      result = extractNaddr(extractNevent(extractNote(result)));
    }
    if (options.urls) {
      result = extractURLs(result, options);
    }
    if (options.emojis) {
      result = extractCustomEmoji(result, tags);
    }
    if (options.hashtags) {
      result = extractHashtags(result);
    }
    if (options.ecash) {
      result = extractEcash(result);
    }
    return result;
  }, [text, options, tags]);
  return fragments;
}

export function Fragments({
  fragments,
  group,
  className,
  classNames = {},
}: {
  fragments: Fragment[];
  group: Group;
  className?: string;
  classNames?: RichTextClassnames;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {...fragments.map((f, idx) => toNode(f, idx, classNames, group))}
    </div>
  );
}

const defaultOptions = {
  inline: false,
  emojis: true,
  mentions: true,
  events: true,
  urls: true,
  hashtags: true,
  ecash: true,
  images: true,
  video: true,
  audio: true,
  youtube: true,
};

export function RichText({
  children,
  options = {},
  tags = [],
  className,
  classNames = {},
  group,
}: {
  children: string;
  options?: RichTextOptions;
  tags?: string[][];
  className?: string;
  classNames?: RichTextClassnames;
  group: Group;
}) {
  const opts = { ...defaultOptions, ...options };
  const fragments = useMemo(() => {
    let result = toFragments(children || "");
    if (opts.mentions) {
      result = extractProfiles(extractMentions(result));
    }
    if (opts.events) {
      result = extractNaddr(extractNevent(extractNote(result)));
    }
    if (opts.urls) {
      result = extractURLs(result, opts);
    }
    if (opts.emojis) {
      result = extractCustomEmoji(result, tags);
    }
    if (opts.hashtags) {
      result = extractHashtags(result);
    }
    if (opts.ecash) {
      result = extractEcash(result);
    }
    // flatten structure to avoid invalid DOM nesting
    return result.reduce((acc, f) => {
      if (f.type === "block") {
        let nodes = f.nodes;
        let blockIndex = nodes.findIndex(isRenderedAsBlock);
        // This is a block that only has inline fragments, keep it as is
        if (blockIndex === -1) {
          acc.push(f);
        }
        // This is a block that has a block fragment, split it into multiple blocks until no nested blocks remain
        while (blockIndex !== -1) {
          // Nodes to the left of the block are kept before the block
          const leftNodes = nodes.slice(0, blockIndex);
          if (leftNodes.length > 0) {
            acc.push({ type: "block", nodes: leftNodes });
          }
          // The block itself is added to the list of blocks
          acc.push(nodes[blockIndex]);
          // Update list of remaining nodes and block index
          nodes = nodes.slice(blockIndex + 1);
          blockIndex = nodes.findIndex(isRenderedAsBlock);
        }
      } else {
        acc.push(f);
      }
      return acc;
    }, [] as Fragment[]);
  }, [children, opts, tags]);
  const body = fragments.map((f, idx) => toNode(f, idx, classNames, group));
  return options.inline ? (
    <span className={className}>{...body}</span>
  ) : (
    <div className={cn("flex flex-col gap-3", className)}>{...body}</div>
  );
}
