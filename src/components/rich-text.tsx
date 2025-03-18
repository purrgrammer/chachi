import { useMemo } from "react";
import { nip19 } from "nostr-tools";
import type {
  AddressPointer,
  EventPointer,
  ProfilePointer,
} from "nostr-tools/nip19";
import { Event, Address } from "@/components/nostr/event";
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
import { CUSTOM_EMOJI_REGEX } from "@/lib/emoji";
import { LazyCodeBlock } from "@/components/lazy-code-block";

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
  pubkey?: string;
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

export type CodeBlockFragment = {
  type: "codeBlock";
  code: string;
  language?: string;
};

export type BoldFragment = {
  type: "bold";
  text: string;
};

export type ItalicFragment = {
  type: "italic";
  text: string;
};

export type MonospaceFragment = {
  type: "monospace";
  text: string;
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
  | EcashFragment
  | BoldFragment
  | ItalicFragment
  | MonospaceFragment;

export type BlockFragment = {
  type: "block";
  nodes: InlineFragment[];
};

export type Fragment = BlockFragment | InlineFragment | CodeBlockFragment;

function isRenderedAsBlock(fragment: Fragment): boolean {
  return (
    fragment.type === "block" ||
    fragment.type === "event" ||
    fragment.type === "address" ||
    fragment.type === "ecash" ||
    fragment.type === "video" ||
    fragment.type === "youtube" ||
    fragment.type === "image" ||
    fragment.type === "audio" ||
    fragment.type === "codeBlock"
  );
}

function toNode(
  fragment: Fragment,
  idx: number,
  classNames: RichTextClassnames,
  group?: Group,
  options?: RichTextOptions,
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
        pubkey={fragment.pubkey}
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
      <Image
        url={fragment.url}
        className={cn(
          "my-1 max-h-[36rem] bg-background/90 object-contain",
          classNames.image,
        )}
      />
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
        className={cn("break-all underline decoration-dotted", classNames.urls)}
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

  if (fragment.type === "codeBlock") {
    return (
      <LazyCodeBlock
        key={idx}
        code={fragment.code}
        language={fragment.language}
        className={classNames.codeBlock || ""}
      />
    );
  }

  if (fragment.type === "bold") {
    return (
      <strong key={idx} className={cn("whitespace-pre-wrap", classNames.bold)}>
        {fragment.text}
      </strong>
    );
  }

  if (fragment.type === "italic") {
    return (
      <em key={idx} className={cn("whitespace-pre-wrap", classNames.italic)}>
        {fragment.text}
      </em>
    );
  }

  if (fragment.type === "monospace") {
    return (
      <code
        key={idx}
        className={cn(
          "bg-background text-foreground px-1 py-0.5 rounded text-sm whitespace-pre-wrap",
          classNames.monospace,
        )}
      >
        {fragment.text}
      </code>
    );
  }

  if (fragment.type === "text") {
    return (
      <span
        key={idx}
        className={cn(
          `break-words whitespace-pre-wrap text-md leading-tight`,
          classNames.spans,
        )}
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
        {...fragment.nodes.map((f, idx) =>
          toNode(f, idx, classNames, group, options),
        )}
      </p>
    );
  }

  return null;
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
  syntax?: boolean;
  bold?: boolean;
  italic?: boolean;
  monospace?: boolean;
  codeBlock?: boolean;
  preserveNewlines?: boolean;
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
  spans?: string;
  paragraphs?: string;
  video?: string;
  audio?: string;
  image?: string;
  youtube?: string;
  codeBlock?: string;
  bold?: string;
  italic?: string;
  monospace?: string;
}

export function useRichText(
  text: string,
  options: RichTextOptions,
  tags: string[][],
): Fragment[] {
  const fragments = useMemo(() => {
    // Process text with all formatting in one go
    let result = toFragments(
      text || "",
      options.syntax,
      options.codeBlock,
      options.preserveNewlines,
      options,
      tags,
    );

    // Processing other elements that aren't formatting-related
    if (options.urls) {
      result = extractURLs(result, options);
    }
    if (options.mentions) {
      result = extractProfiles(extractMentions(result));
    }
    if (options.events) {
      result = extractNaddr(extractNevent(extractNote(result)));
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
  options,
}: {
  fragments: Fragment[];
  group?: Group;
  className?: string;
  classNames?: RichTextClassnames;
  options?: RichTextOptions;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {...fragments.map((f, idx) => toNode(f, idx, classNames, group, options))}
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
  syntax: false,
  codeBlock: false,
  preserveNewlines: true,
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
  group?: Group;
}) {
  const opts = { ...defaultOptions, ...options };
  const fragments = useMemo(() => {
    // Process text with all formatting in one go
    let result = toFragments(
      children || "",
      opts.syntax,
      opts.codeBlock,
      opts.preserveNewlines,
      opts,
      tags,
    );

    if (opts.urls) {
      result = extractURLs(result, opts);
    }
    if (opts.mentions) {
      result = extractProfiles(extractMentions(result));
    }
    if (opts.events) {
      result = extractNaddr(extractNevent(extractNote(result)));
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
          const rightNodes = nodes.slice(blockIndex + 1);
          nodes = rightNodes;
          blockIndex = nodes.findIndex(isRenderedAsBlock);
          if (blockIndex === -1 && rightNodes.length > 0) {
            acc.push({ type: "block", nodes: rightNodes });
          }
        }
      } else {
        acc.push(f);
      }
      return acc;
    }, [] as Fragment[]);
  }, [children, opts, tags]);
  const body = fragments.map((f, idx) =>
    toNode(f, idx, classNames, group, opts),
  );
  return options.inline ? (
    <span dir="auto" className={className}>
      {...body}
    </span>
  ) : (
    <div dir="auto" className={cn("flex flex-col gap-3", className)}>
      {...body}
    </div>
  );
}

function toFragments(
  text: string,
  enableSyntax: boolean = true,
  enableCodeBlock: boolean = true,
  preserveNewlines: boolean = true,
  options?: RichTextOptions,
  tags: string[][] = [],
): Fragment[] {
  if (!text) return [];

  // Process custom emojis first if enabled
  let processedText = text;
  if (options?.emojis !== false && tags && tags.length > 0) {
    processedText = processedText.replace(CUSTOM_EMOJI_REGEX, (match) => {
      const code = match.slice(1, -1);
      const image = tags.find((t) => t[0] === "emoji" && t[1] === code)?.[2];
      if (image) {
        return `<emoji data-name="${code}" data-image="${image}"></emoji>`;
      }
      return match;
    });
  }

  // If syntax highlighting is disabled, just return the text
  if (!enableSyntax) {
    // If preserveNewlines is enabled, split by newlines
    if (preserveNewlines) {
      return processedText
        .split(/\n/)
        .filter(Boolean)
        .map((line) => {
          // Process emoji markers in text
          const nodes: InlineFragment[] = [];
          const emojiRegex =
            /<emoji data-name="(.*?)" data-image="(.*?)"><\/emoji>/g;
          let lastIndex = 0;
          let match;

          while ((match = emojiRegex.exec(line)) !== null) {
            if (match.index > lastIndex) {
              nodes.push({
                type: "text",
                text: line.substring(lastIndex, match.index),
              });
            }
            nodes.push({
              type: "emoji",
              name: match[1],
              image: match[2],
            });
            lastIndex = match.index + match[0].length;
          }

          if (lastIndex < line.length) {
            nodes.push({
              type: "text",
              text: line.substring(lastIndex),
            });
          }

          return {
            type: "block",
            nodes: nodes.length ? nodes : [{ type: "text", text: line }],
          };
        });
    }

    // Process emoji markers in the single block
    const nodes: InlineFragment[] = [];
    const emojiRegex = /<emoji data-name="(.*?)" data-image="(.*?)"><\/emoji>/g;
    let lastIndex = 0;
    let match;

    while ((match = emojiRegex.exec(processedText)) !== null) {
      if (match.index > lastIndex) {
        nodes.push({
          type: "text",
          text: processedText.substring(lastIndex, match.index),
        });
      }
      nodes.push({
        type: "emoji",
        name: match[1],
        image: match[2],
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < processedText.length) {
      nodes.push({
        type: "text",
        text: processedText.substring(lastIndex),
      });
    }

    return [
      {
        type: "block",
        nodes: nodes.length ? nodes : [{ type: "text", text: processedText }],
      },
    ];
  }

  // If code blocks are disabled, process syntax on the entire text
  if (!enableCodeBlock) {
    // Process the text for formatting
    let syntaxProcessedText = processedText;

    // Apply bold formatting if enabled
    if (options?.bold !== false) {
      syntaxProcessedText = syntaxProcessedText.replace(boldRegex, (match) => {
        const innerText = match.slice(1, -1);
        return `<bold>${innerText}</bold>`;
      });
    }

    // Apply italic formatting if enabled
    if (options?.italic !== false) {
      syntaxProcessedText = syntaxProcessedText.replace(
        italicRegex,
        (match) => {
          const innerText = match.slice(1, -1);
          return `<italic>${innerText}</italic>`;
        },
      );
    }

    // Apply monospace formatting if enabled
    if (options?.monospace !== false) {
      syntaxProcessedText = syntaxProcessedText.replace(
        monospaceRegex,
        (match) => {
          const innerText = match.slice(1, -1);
          return `<monospace>${innerText}</monospace>`;
        },
      );
    }

    // Parse the entire text for formatted elements
    const nodes: InlineFragment[] = [];
    const processedContent = syntaxProcessedText;
    let matchResult;
    let lastIndex = 0;

    // Process all formatting tags and emojis in one pass
    const formattingRegex =
      /<(bold|italic|monospace|emoji)(?: data-name="(.*?)" data-image="(.*?)")?>([\s\S]*?)<\/\1>/g;
    while ((matchResult = formattingRegex.exec(processedContent)) !== null) {
      // Add text before the match
      if (matchResult.index > lastIndex) {
        nodes.push({
          type: "text",
          text: processedContent.substring(lastIndex, matchResult.index),
        });
      }

      // Add the formatted text based on tag type
      const tagType = matchResult[1];

      if (tagType === "emoji") {
        nodes.push({
          type: "emoji",
          name: matchResult[2],
          image: matchResult[3],
        });
      } else {
        const content = matchResult[4] || matchResult[2]; // Content is in different group for emoji vs. text formatting
        if (tagType === "bold") {
          nodes.push({ type: "bold", text: content });
        } else if (tagType === "italic") {
          nodes.push({ type: "italic", text: content });
        } else if (tagType === "monospace") {
          nodes.push({ type: "monospace", text: content });
        }
      }

      lastIndex = matchResult.index + matchResult[0].length;
    }

    // Add any remaining text
    if (lastIndex < processedContent.length) {
      nodes.push({ type: "text", text: processedContent.substring(lastIndex) });
    }

    // If we need to preserve newlines, split the blocks appropriately
    if (preserveNewlines) {
      const result: Fragment[] = [];

      // First, collect all the text and formatted nodes and combine them into lines
      const lines: InlineFragment[][] = [[]];
      let currentLine = 0;

      for (const node of nodes) {
        if (node.type === "text") {
          // For plain text, split by newlines
          const textLines = node.text.split(/\n/);

          // Add the first part to current line
          if (textLines[0]) {
            lines[currentLine].push({ type: "text", text: textLines[0] });
          }

          // Create new lines for the rest
          for (let i = 1; i < textLines.length; i++) {
            currentLine++;
            lines[currentLine] = [];
            if (textLines[i]) {
              lines[currentLine].push({ type: "text", text: textLines[i] });
            }
          }
        } else if (
          node.type === "bold" ||
          node.type === "italic" ||
          node.type === "monospace"
        ) {
          // For formatted text with newlines, we need to distribute it across the right lines
          if (node.text.includes("\n")) {
            const formattedLines = node.text.split(/\n/);

            // Add the first part to current line
            if (formattedLines[0]) {
              lines[currentLine].push({
                type: node.type,
                text: formattedLines[0],
              } as InlineFragment);
            }

            // Create new lines for the rest
            for (let i = 1; i < formattedLines.length; i++) {
              currentLine++;
              lines[currentLine] = [];
              if (formattedLines[i]) {
                lines[currentLine].push({
                  type: node.type,
                  text: formattedLines[i],
                } as InlineFragment);
              }
            }
          } else {
            // No newlines in the formatted text, keep on current line
            lines[currentLine].push(node);
          }
        } else {
          // For emoji and other node types, keep on current line
          lines[currentLine].push(node);
        }
      }

      // Convert the lines to block fragments
      for (const line of lines) {
        if (line.length > 0) {
          result.push({
            type: "block",
            nodes: line,
          });
        }
      }

      return result;
    } else {
      // No need to preserve newlines, return as a single block
      return [{ type: "block", nodes }];
    }
  }

  // First, detect code blocks
  const result: Fragment[] = [];
  let lastIndex = 0;
  let match;

  // Create a copy of the regexp with the global flag to find code blocks
  const regex = new RegExp(codeBlockRegex.source, codeBlockRegex.flags);

  // Process the entire text to find code blocks first
  while ((match = regex.exec(processedText)) !== null) {
    // Process text before the code block with formatting
    if (match.index > lastIndex) {
      const textBefore = processedText.substring(lastIndex, match.index);

      // Process the text for formatting (uses recursion to handle formatting)
      const formattedBlocks = toFragments(
        textBefore,
        enableSyntax,
        false,
        preserveNewlines,
        options,
        tags,
      );
      result.push(...formattedBlocks);
    }

    let language: string | undefined = undefined;
    let code: string;

    // Check if the language part ends with a newline, indicating it's a proper language specifier
    const languagePart = match[1];
    if (languagePart && languagePart.endsWith("\n")) {
      language = languagePart.slice(0, -1).trim(); // Remove the newline and trim
      code = match[2];
    } else {
      // If no newline after potential language specifier, treat everything as code
      code = (languagePart || "") + match[2];
    }

    // Add the code block
    result.push({
      type: "codeBlock",
      code: code.trimEnd(),
      language: language || undefined,
    });

    lastIndex = match.index + match[0].length;
  }

  // Process remaining text after the last code block
  if (lastIndex < processedText.length) {
    const textAfter = processedText.substring(lastIndex);

    // Process the text for formatting (uses recursion to handle formatting)
    const formattedBlocks = toFragments(
      textAfter,
      enableSyntax,
      false,
      preserveNewlines,
      options,
      tags,
    );
    result.push(...formattedBlocks);
  }

  return result;
}

function extract(
  fragments: Fragment[],
  regexp: RegExp,
  parse: (s: string) => Fragment,
): Fragment[] {
  return fragments
    .map((f) => {
      if (f.type === "text") {
        const result: Fragment[] = [];
        let lastIndex = 0;
        let match;

        // Create a copy of the regexp with the global flag
        const globalRegexp = new RegExp(
          regexp.source,
          regexp.flags.includes("g") ? regexp.flags : regexp.flags + "g",
        );

        // Find all matches
        while ((match = globalRegexp.exec(f.text)) !== null) {
          // Add text before the match as a text fragment
          if (match.index > lastIndex) {
            result.push({
              type: "text",
              text: f.text.substring(lastIndex, match.index),
            });
          }

          // Try to parse the matched text
          try {
            result.push(parse(match[0]));
          } catch {
            result.push({ type: "text", text: match[0] });
          }

          lastIndex = match.index + match[0].length;
        }

        // Add the remaining text after the last match
        if (lastIndex < f.text.length) {
          result.push({ type: "text", text: f.text.substring(lastIndex) });
        }

        return result;
      } else if (f.type === "block") {
        return {
          type: "block",
          nodes: extract(f.nodes, regexp, parse),
        } as Fragment;
      }
      return f;
    })
    .flat();
}

function parseNpub(s: string): Fragment {
  const raw = s.replace(NostrPrefixRegex, "");
  const pubkey = nip19.decode(raw).data;
  return { type: "mention", pubkey, relays: [] } as Fragment;
}

function extractMentions(fragments: Fragment[]): Fragment[] {
  return extract(fragments, /(nostr:npub1[a-z0-9]+)/g, parseNpub);
}

function parseNprofile(s: string): Fragment {
  const raw = s.replace(NostrPrefixRegex, "");
  const { pubkey, relays } = nip19.decode(raw).data as ProfilePointer;
  return { type: "mention", pubkey, relays: relays || [] } as Fragment;
}

function extractProfiles(fragments: Fragment[]): Fragment[] {
  return extract(fragments, /(nostr:nprofile1[a-z0-9]+)/g, parseNprofile);
}

function parseNote(s: string): Fragment {
  const note = s.replace(NostrPrefixRegex, "");
  const id = nip19.decode(note).data;
  return { type: "event", id, relays: [], kind: 1 } as Fragment;
}

function extractNote(fragments: Fragment[]): Fragment[] {
  return extract(fragments, /(nostr:note1[a-z0-9]+)/g, parseNote);
}

function parseEvent(s: string): Fragment {
  const nevent = s.replace(NostrPrefixRegex, "");
  const { id, relays, author, kind } = nip19.decode(nevent)
    .data as EventPointer;
  return {
    type: "event",
    id,
    relays: relays || [],
    kind,
    pubkey: author,
  } as Fragment;
}

function extractNevent(fragments: Fragment[]): Fragment[] {
  return extract(fragments, /(nostr:nevent1[a-z0-9]+)/g, parseEvent);
}

function parseAddress(s: string): Fragment {
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
}

function extractNaddr(fragments: Fragment[]): Fragment[] {
  return extract(fragments, /(nostr:naddr1[a-z0-9]+)/g, parseAddress);
}

//const nostrEntityRegex = /^(npub1|nprofile1|note1|nevent1|naddr1)[a-z0-9]+$/g;

function extractURLs(
  fragments: Fragment[],
  options: RichTextOptions,
): Fragment[] {
  return extract(fragments, urlRegex, (url: string) => {
    //const last = url.split("/").pop()?.trim();
    //if (last && nostrEntityRegex.test(last)) {
    //  const fragment = last.startsWith("nevent1")
    //    ? parseEvent(last)
    //    : last.startsWith("note1")
    //      ? parseNote(last)
    //      : last.startsWith("npub1")
    //        ? parseNpub(last)
    //        : last.startsWith("nprofile1")
    //          ? parseNprofile(last)
    //          : parseAddress(last);
    //  return fragment;
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
  });
}

const hashtagRegex = /(?<=\s|^)(#[^\s!@#$%^&*()=+./,[{\]};:'"?><]+)/g;

function extractHashtags(fragments: Fragment[]): Fragment[] {
  return extract(fragments, hashtagRegex, (tag: string) => {
    return { type: "hashtag", tag: tag.slice(1) } as Fragment;
  });
}

const cashuRegex = /(cashu[AB][A-Za-z0-9_-]{0,10000}={0,3})/gi;

function extractEcash(fragments: Fragment[]): Fragment[] {
  return extract(fragments, cashuRegex, (token: string) => {
    return { type: "ecash", token } as Fragment;
  });
}

// Regex for code blocks - improved to handle GitHub-style language specifiers
const codeBlockRegex = /```((?:[a-zA-Z0-9\-+]+)\n|)([\s\S]*?)```/g;

// Bold text regex - modified to handle multiline text
const boldRegex = /\*([\s\S]*?)\*/g;

// Italic text regex - modified to handle multiline text
const italicRegex = /_([\s\S]*?)_/g;

// Modified monospace regex to ensure it doesn't conflict with code blocks
// and to handle multiline text
const monospaceRegex = /(?<!(`))`([\s\S]*?)`(?!(`))/g;
