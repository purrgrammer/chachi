type GroupId = string;

export interface Group {
  id: GroupId;
  relay: string;
}

export interface GroupMetadata extends Group {
  name: string;
  about?: string;
  pubkey?: string;
  picture?: string;
  visibility?: "public" | "private";
  access?: "open" | "closed";
  nlink?: string;
}

export interface GroupMembers extends GroupMetadata {
  members: string[];
}

export interface Relay {
  url: string;
}

export interface Profile {
  pubkey: string;
  name?: string;
  about?: string;
  picture?: string;
  display_name?: string;
  lud16?: string;
}

export interface NativeEmoji {
  name: string;
  shortcodes: string;
  native: string;
}

export interface CustomEmoji {
  name: string;
  shortcodes: string;
  image: string;
}

export type Emoji = {
  name: string;
  native?: string;
  shortcodes: string;
  image?: string;
};

export interface EmojiSet {
  name: string;
  identifier: string;
  pubkey: string;
  emojis: CustomEmoji[];
}

export type LoginMethod = "nip07" | "nip46"; // | 'npub' | 'nsec';

export interface Account {
  method: LoginMethod;
  pubkey: string;
  isReadOnly?: boolean;
  bunker?: string;
  secret?: string;
  relays?: string[];
}
