import { useAtom, useAtomValue } from "jotai";
import { NostrEvent } from "nostr-tools";
import { ReactNode, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import NDK, {
  NDKUser,
  NDKKind,
  NDKSubscriptionCacheUsage,
  NDKRelaySet,
  NDKNip07Signer,
  NDKNip46Signer,
  NDKPrivateKeySigner,
} from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { discoveryRelays } from "@/lib/relay";
import {
  accountAtom,
  accountsAtom,
  relayListAtom,
  relaysAtom,
  mintListAtom,
  cashuAtom,
  groupListAtom,
  contactListAtom,
  mediaServerListAtom,
  emojiListAtom,
  emojiSetsAtom,
} from "@/app/store";
import { isRelayURL } from "@/lib/relay";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { useGroups } from "@/lib/nostr/groups";
import { useGroupMessages } from "@/lib/nostr/chat";
import { fetchCustomEmojis } from "@/lib/nostr/emojis";
import { useChachiWallet } from "@/lib/wallet";
import { usePubkey } from "@/lib/account";
import Landing from "@/components/landing";

function useUserEvents() {
  const ndk = useNDK();
  const [account, setAccount] = useAtom(accountAtom);
  const accounts = useAtomValue(accountsAtom);
  const pubkey = account?.pubkey;
  const relays = useAtomValue(relaysAtom);
  const [mints, setMints] = useAtom(mintListAtom);
  const [cashu, setCashu] = useAtom(cashuAtom);
  const [groupList, setGroupList] = useAtom(groupListAtom);
  const [relayList, setRelayList] = useAtom(relayListAtom);
  const [contactList, setContactList] = useAtom(contactListAtom);
  const [mediaServerList, setMediaServerList] = useAtom(mediaServerListAtom);
  const [emojiList, setEmojiList] = useAtom(emojiListAtom);
  const [, setEmojiSets] = useAtom(emojiSetsAtom);

  // Log in account
  useEffect(() => {
    const loginMethod = localStorage.getItem("login-method");
    if (loginMethod === '"nip07"') {
      const signer = new NDKNip07Signer();
      signer
        .blockUntilReady()
        .then((user) => {
          ndk.signer = signer;
          setAccount({ method: "nip07", pubkey: user.pubkey });
        })
        .catch((err) => {
          console.error(err);
        });
    } else if (loginMethod === '"nip46"') {
      const nip46account = accounts.find((a) => a.method === "nip46");
      if (
        nip46account &&
        nip46account.secret &&
        nip46account.bunker &&
        nip46account.relays?.length
      ) {
        const bunkerNDK = new NDK({
          explicitRelayUrls: nip46account.relays,
        });
        const signer = new NDKNip46Signer(
          bunkerNDK,
          nip46account.bunker,
          new NDKPrivateKeySigner(nip46account.secret),
        );
        signer
          .blockUntilReady()
          .then(() => {
            ndk.signer = signer;
            setAccount(nip46account);
          })
          .catch((err) => {
            console.error(err);
          });
      }
    } else if (loginMethod === '"nsec"') {
      const nsecAccount = accounts.find((a) => a.method === "nsec");
      if (nsecAccount && nsecAccount.privkey) {
        const signer = new NDKPrivateKeySigner(nsecAccount.privkey);
        ndk.signer = signer;
        setAccount({
          method: "nsec",
          pubkey: nsecAccount.pubkey,
          privkey: nsecAccount.privkey,
        });
      }
    }
  }, []);

  // NIP-65 relay list
  useEffect(() => {
    if (!pubkey) return;

    const sub = ndk.subscribe(
      {
        kinds: [NDKKind.RelayList],
        authors: [pubkey],
        since: relayList.created_at,
      },
      {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        closeOnEose: false,
      },
      NDKRelaySet.fromRelayUrls(discoveryRelays, ndk),
    );

    sub.on("event", (event) => {
      if (event.created_at && event.created_at > (relayList.created_at || 0)) {
        const userRelays = event.tags
          .filter((t) => t[0] === "r" && t[1] && isRelayURL(t[1]))
          .map((t) => ({ url: t[1] }));
        setRelayList({ relays: userRelays, created_at: event.created_at });
      }
    });

    return () => sub.stop();
  }, [pubkey]);

  // Mint list
  useEffect(() => {
    if (!pubkey) return;

    const filter = {
      kinds: [NDKKind.CashuMintList],
      authors: [pubkey],
      ...(mints.created_at ? { since: mints.created_at } : {}),
    };
    const sub = ndk.subscribe(
      filter,
      {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        closeOnEose: false,
      },
      NDKRelaySet.fromRelayUrls(discoveryRelays, ndk),
    );

    sub.on("event", (event) => {
      if (event.created_at && event.created_at > (mints.created_at || 0)) {
        const mints = event.tags
          .filter((t) => t[0] === "mint")
          .map((t) => t[1]);
        const relays = event.tags
          .filter((t) => t[0] === "relay")
          .map((t) => t[1]);
        const pubkey = event.tags.find((t) => t[0] === "pubkey")?.[1];
        setMints({ created_at: event.created_at, mints, relays, pubkey });
      }
    });

    return () => sub.stop();
  }, [pubkey]);

  // Cashu wallet
  useEffect(() => {
    if (!pubkey) return;

    const filter = {
      kinds: [NDKKind.CashuWallet],
      authors: [pubkey],
      ...(cashu && cashu.created_at ? { since: cashu.created_at } : {}),
    };
    const sub = ndk.subscribe(
      filter,
      {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        closeOnEose: false,
      },
      NDKRelaySet.fromRelayUrls(
        relays.map((r) => r.url),
        ndk,
      ),
    );

    sub.on("event", (event) => {
      const lastSeen = cashu ? cashu.created_at : 0;
      if (event.created_at && event.created_at > lastSeen) {
        setCashu(event.rawEvent() as NostrEvent);
      }
    });

    return () => sub.stop();
  }, [pubkey]);

  // Groups, contacts, media server and emoji list
  useEffect(() => {
    if (pubkey && relays.length > 0) {
      const filters = [
        {
          kinds: [NDKKind.Metadata],
          authors: [pubkey],
        },
        {
          kinds: [NDKKind.SimpleGroupList],
          authors: [pubkey],
          since: groupList.created_at,
        },
        {
          kinds: [NDKKind.Contacts],
          authors: [pubkey],
          since: contactList.created_at,
        },
        {
          kinds: [NDKKind.BlossomList],
          authors: [pubkey],
          since: mediaServerList.created_at,
        },
        {
          kinds: [NDKKind.EmojiList],
          authors: [pubkey],
          since: emojiList.created_at,
        },
      ];
      const sub = ndk.subscribe(
        filters,
        {
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
          closeOnEose: false,
        },
        NDKRelaySet.fromRelayUrls(
          relays.map((r) => r.url),
          ndk,
        ),
      );

      sub.on("event", async (event) => {
        if (event.kind === NDKKind.SimpleGroupList) {
          const userGroups = event.tags
            .filter((t) => t[0] === "group" && t[1] && t[2] && isRelayURL(t[2]))
            .map((t) => ({ id: t[1], relay: t[2] }));
          if (
            event.created_at &&
            event.created_at > (groupList.created_at || 0)
          ) {
            try {
              await event.decrypt(new NDKUser({ pubkey }));
              const privateGroups = (JSON.parse(event.content) as string[][])
                .filter(
                  (t) => t[0] === "group" && t[1] && t[2] && isRelayURL(t[2]),
                )
                .map((t) => ({ id: t[1], relay: t[2] }));
              setGroupList({
                groups: userGroups,
                content: event.content,
                created_at: event.created_at,
                couldDecrypt: true,
                privateGroups,
              });
            } catch (err) {
              console.error(err);
              setGroupList({
                groups: userGroups,
                content: event.content,
                created_at: event.created_at,
                couldDecrypt: false,
                privateGroups: [],
              });
            }
          }
        } else if (event.kind === NDKKind.Contacts) {
          // todo: petnames
          if (
            event.created_at &&
            event.created_at > (contactList.created_at || 0)
          ) {
            const pubkeys = event.tags
              .filter((t) => t[0] === "p" && t[1] && t[1].length === 64)
              .map((t) => t[1]);
            setContactList({
              created_at: event.created_at,
              pubkeys,
            });
          }
        } else if (event.kind === NDKKind.BlossomList) {
          if (
            event.created_at &&
            event.created_at > (mediaServerList.created_at || 0)
          ) {
            const servers = event.tags
              .filter((t) => t[0] === "server" && t[1])
              .map((t) => t[1]);
            if (servers.length > 0) {
              setMediaServerList({ created_at: event.created_at, servers });
            }
          }
        } else if (event.kind === NDKKind.EmojiList) {
          if (
            event.created_at &&
            event.created_at > (emojiList.created_at || 0)
          ) {
            const emojiSetRefs =
              event.tags.filter((t) => t[0] === "a").map((t) => t[1]) ?? [];
            setEmojiList({
              created_at: event.created_at,
              emojis: emojiSetRefs,
            });
          }
        }
      });

      return () => sub.stop();
    }
  }, [pubkey, relays]);

  // Emoji sets
  useEffect(() => {
    fetchCustomEmojis(
      ndk,
      emojiList.emojis,
      NDKRelaySet.fromRelayUrls(
        relays.map((r) => r.url),
        ndk,
      ),
    )
      .then((emojiSets) => {
        setEmojiSets(emojiSets);
      })
      .catch((err) => console.error(err));
  }, [emojiList]);

  // Groups and messages
  useGroups(groupList.groups);
  useGroupMessages(groupList.groups);
  // Wallet
  useChachiWallet();
}

function NostrSync({ children }: { children: ReactNode }) {
  useUserEvents();
  return children;
}

export default function Layout() {
  const pubkey = usePubkey();
  const location = useLocation();
  const isApp = pubkey || location.pathname !== "/";
  return (
    <NostrSync>
      {isApp ? (
        <>
          <AppSidebar />
          <SidebarInset>
            <Outlet />
          </SidebarInset>
        </>
      ) : (
        <Landing />
      )}
    </NostrSync>
  );
}
