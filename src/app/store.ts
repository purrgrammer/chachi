import { atom, useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
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
}

export const groupListAtom = atomWithStorage<GroupList>(
  "group-list",
  {
    created_at: 0,
    content: "",
    groups: [],
  },
  createJSONStorage<GroupList>(() => localStorage),
  { getOnInit: true },
);
export const groupsAtom = atom<Group[]>((get) => {
  return get(groupListAtom).groups;
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

  return () => {
    setAccount(null);
    setLoginMethod(null);
    setGroupList({ created_at: 0, content: "", groups: [] });
    setRelayList({ created_at: 0, relays: [] });
    setContactList({ created_at: 0, pubkeys: [] });
    setMediaServersList({ created_at: 0, servers: defaultMediaServers });
    setEmojiList({ created_at: 0, emojis: [] });
  };
}
