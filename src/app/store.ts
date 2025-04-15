import { atom, useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { NostrEvent } from "nostr-tools";
import { discoveryRelays } from "@/lib/relay";
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
  "mygroups",
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
const communities = new Set([
  "599f67f7df7694c603a6d0636e15ebc610db77dcfd47d6e5d05386d821fb3ea9",
  "46fc871c1aedb295a8325abcf7663467d297b0a852733ceb06b0957d1c14bff4",
  "7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194",
  "660d8c78651f70487ec9b8ddc283e29cf2561693dda3ba246d3fd3c08dbb7083",
  "43baaf0c28e6cfb195b17ee083e19eb3a4afdfac54d9b6baf170270ed193e34c",
]);
export const groupsAtom = atom<Group[]>((get) => {
  const { groups, privateGroups } = get(groupListAtom);
  // todo: deduplicate, show private
  return groups.concat(privateGroups || []).filter((g) => {
    if (!g.isCommunity) return !communities.has(g.id);
    return true;
  });
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
  "my-relay-list",
  {
    created_at: 0,
    relays: discoveryRelays.map((url) => ({ url })),
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

export const communikeyAtom = atomWithStorage<NostrEvent | null>(
  "communikey",
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
export const emojiSetsAtom = atomWithStorage<EmojiSet[]>(
  "emoji-sets",
  [],
  createJSONStorage<EmojiSet[]>(() => localStorage),
  { getOnInit: true },
);

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
  const [, setCommunikey] = useAtom(communikeyAtom);

  return () => {
    setAccount(null);
    setLoginMethod(null);
    setCashu(null);
    setCommunikey(null);
    setMintList({ created_at: 0, mints: [], relays: [] });
    setGroupList({ created_at: 0, content: "", groups: [] });
    setRelayList({ created_at: 0, relays: [] });
    setContactList({ created_at: 0, pubkeys: [] });
    setMediaServersList({ created_at: 0, servers: defaultMediaServers });
    setEmojiList({ created_at: 0, emojis: [] });
  };
}
