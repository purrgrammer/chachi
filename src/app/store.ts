import { atom, useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { NostrEvent } from "nostr-tools";
import type { LoginMethod, Account, Group, Relay, EmojiSet } from "@/lib/types";

// todo: navigation history
// todo: notifications

// Login method and account
export const accountAtom = atom<Account | null>(null);
export const accountIdAtom = atom<string | null>(null);
export const methodAtom = atomWithStorage<LoginMethod | null>(
  "login-method",
  null,
  createJSONStorage<LoginMethod | null>(() => localStorage),
  { getOnInit: true },
);
export const accountsAtom = atomWithStorage<Account[]>(
  "accounts",
  [],
  createJSONStorage<Account[]>(() => localStorage),
  { getOnInit: true },
);

// Groups and Relays
interface GroupList {
  created_at: number;
  content: string;
  groups: Group[];
  couldDecrypt?: boolean;
  privateGroups?: Group[];
}

export const groupListAtom = atomWithStorage<GroupList>(
  "groups",
  {
    created_at: 0,
    content: "",
    groups: [],
    couldDecrypt: false,
    privateGroups: [],
  },
  createJSONStorage<GroupList>(() => localStorage),
  { getOnInit: true },
);
export const groupsAtom = atom<Group[]>((get) => {
  const { groups, privateGroups } = get(groupListAtom);
  // todo: deduplicate, show private
  return groups.concat(privateGroups || []);
});
export const groupsContentAtom = atom<string>((get) => {
  return get(groupListAtom).content;
});

// Relays

interface RelayList {
  created_at: number;
  relays: Relay[];
}

export const relayListAtom = atomWithStorage<RelayList>(
  "relay-list",
  {
    created_at: 0,
    relays: [],
  },
  createJSONStorage<RelayList>(() => localStorage),
  { getOnInit: true },
);
export const relaysAtom = atom<Relay[]>((get) => {
  return get(relayListAtom).relays;
});

// Cashu mints
interface MintList {
  created_at: number;
  mints: string[];
  relays: string[];
  pubkey?: string;
}

export const mintListAtom = atomWithStorage<MintList>(
  "mints-list",
  {
    created_at: 0,
    mints: [],
    relays: [],
    pubkey: undefined,
  },
  createJSONStorage<MintList>(() => localStorage),
  { getOnInit: true },
);
export const mintsAtom = atom<string[]>((get) => {
  return get(mintListAtom).mints;
});
export const mintRelaysAtom = atom<string[]>((get) => {
  return get(mintListAtom).relays;
});

// Frens
interface ContactList {
  created_at: number;
  pubkeys: string[];
}

export const contactListAtom = atomWithStorage<ContactList>(
  "contact-list",
  {
    created_at: 0,
    pubkeys: [],
  },
  createJSONStorage<ContactList>(() => localStorage),
  { getOnInit: true },
);
export const followsAtom = atom<string[]>((get) => {
  return get(contactListAtom).pubkeys;
});

// Blossom media servers
interface MediaServers {
  created_at: number;
  servers: string[];
}

const defaultMediaServers = ["https://files.v0l.io", "https://nostr.build"];
export const mediaServerListAtom = atomWithStorage<MediaServers>(
  "media-servers",
  {
    created_at: 0,
    servers: defaultMediaServers,
  },
  createJSONStorage<MediaServers>(() => localStorage),
  { getOnInit: true },
);
export const mediaServersAtom = atom<string[]>((get) => {
  return get(mediaServerListAtom).servers;
});

export const cashuAtom = atomWithStorage<NostrEvent | null>(
  "cashu",
  null,
  createJSONStorage<NostrEvent | null>(() => localStorage),
  { getOnInit: true },
);

// Emojis
interface EmojiList {
  created_at: number;
  emojis: string[]; // `a` refs
}

export const emojiListAtom = atomWithStorage<EmojiList>(
  "emoji-list",
  {
    created_at: 0,
    emojis: [],
  },
  createJSONStorage<EmojiList>(() => localStorage),
  { getOnInit: true },
);
export const emojiSetsAtom = atom<EmojiSet[]>([]);

export function useResetState() {
  const [, setAccount] = useAtom(accountAtom);
  const [, setLoginMethod] = useAtom(methodAtom);
  const [, setGroupList] = useAtom(groupListAtom);
  const [, setRelayList] = useAtom(relayListAtom);
  const [, setContactList] = useAtom(contactListAtom);
  const [, setMediaServersList] = useAtom(mediaServerListAtom);
  const [, setEmojiList] = useAtom(emojiListAtom);
  const [, setCashu] = useAtom(cashuAtom);
  const [, setMintList] = useAtom(mintListAtom);

  return () => {
    setAccount(null);
    setLoginMethod(null);
    setCashu(null);
    setMintList({ created_at: 0, mints: [], relays: [] });
    setGroupList({ created_at: 0, content: "", groups: [] });
    setRelayList({ created_at: 0, relays: [] });
    setContactList({ created_at: 0, pubkeys: [] });
    setMediaServersList({ created_at: 0, servers: defaultMediaServers });
    setEmojiList({ created_at: 0, emojis: [] });
  };
}
