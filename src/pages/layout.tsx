import { useAtom, useAtomValue } from "jotai";
import { NostrEvent } from "nostr-tools";
import { useState, ReactNode, useEffect } from "react";
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
import {
  accountAtom,
  accountsAtom,
  relayListAtom,
  dmRelayListAtom,
  relaysAtom,
  mintListAtom,
  cashuAtom,
  groupListAtom,
  contactListAtom,
  mediaServerListAtom,
  communikeyAtom,
} from "@/app/store";
import { isRelayURL } from "@/lib/relay";
import Landing from "@/components/landing";
import { LoadingScreen } from "@/components/loading-screen";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { fetchCommunity, useGroups } from "@/lib/nostr/groups";
import { useGroupMessages } from "@/lib/nostr/chat";
import { useSyncEmojiSets } from "@/lib/nostr/emojis";
import { useChachiWallet } from "@/lib/wallet";
import { RELATIONSHIP, COMMUNIKEY } from "@/lib/kinds";
import { discoveryRelays } from "@/lib/relay";
import { useDirectMessages } from "@/lib/nostr/dm";
import { usePubkey } from "@/lib/account";

function useUserEvents({
  loginMethod,
  onLogin,
  onLoginFailed,
}: {
  loginMethod: string | null;
  onLogin?: () => void;
  onLoginFailed?: () => void;
}) {
  const ndk = useNDK();
  const [account, setAccount] = useAtom(accountAtom);
  const accounts = useAtomValue(accountsAtom);
  const pubkey = account?.pubkey;
  const relays = useAtomValue(relaysAtom);
  const [mints, setMints] = useAtom(mintListAtom);
  const [cashu, setCashu] = useAtom(cashuAtom);
  const [communikey, setCommunikey] = useAtom(communikeyAtom);
  const [groupList, setGroupList] = useAtom(groupListAtom);
  const [relayList, setRelayList] = useAtom(relayListAtom);
  const [dmRelayList, setDmRelayList] = useAtom(dmRelayListAtom);
  const [contactList, setContactList] = useAtom(contactListAtom);
  const [mediaServerList, setMediaServerList] = useAtom(mediaServerListAtom);

  // Log in account
  useEffect(() => {
    if (loginMethod === '"nip07"') {
      const signer = new NDKNip07Signer();
      signer
        .blockUntilReady()
        .then((user) => {
          ndk.signer = signer;
          setAccount({ method: "nip07", pubkey: user.pubkey });
          onLogin?.();
        })
        .catch((err) => {
          onLoginFailed?.();
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
            onLogin?.();
          })
          .catch((err) => {
            onLoginFailed?.();
            console.error(err);
          });
      }
    } else if (loginMethod === '"nsec"') {
      try {
        const nsecaccount = accounts.find((a) => a.method === "nsec");
        if (nsecaccount && nsecaccount.privkey) {
          const signer = new NDKPrivateKeySigner(nsecaccount.privkey);
          ndk.signer = signer;
          setAccount(nsecaccount);
          onLogin?.();
        }
      } catch (err) {
        console.error(err);
        onLoginFailed?.();
      }
    }
  }, []);

  // NIP-65 relay list
  useEffect(() => {
    if (!pubkey) return;

    const sub = ndk.subscribe(
      [
        {
          kinds: [NDKKind.RelayList],
          authors: [pubkey],
          since: relayList.created_at,
        },
        {
          kinds: [NDKKind.DirectMessageReceiveRelayList],
          authors: [pubkey],
          since: dmRelayList.created_at,
        },
      ],
      {
        cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
        closeOnEose: false,
      },
      NDKRelaySet.fromRelayUrls(discoveryRelays, ndk),
    );

    sub.on("event", (event) => {
      if (
        event.kind === NDKKind.RelayList &&
        event.created_at &&
        event.created_at > (relayList.created_at || 0)
      ) {
        const userRelays = event.tags
          .filter((t) => t[0] === "r" && t[1] && isRelayURL(t[1]))
          .map((t) => ({ url: t[1] }));
        setRelayList({ relays: userRelays, created_at: event.created_at });
      } else if (
        event.kind === NDKKind.DirectMessageReceiveRelayList &&
        event.created_at &&
        event.created_at > (dmRelayList.created_at || 0)
      ) {
        const dmRelays = event.tags
          .filter((t) => t[0] === "relay" && t[1] && isRelayURL(t[1]))
          .map((t) => ({ url: t[1] }));
        setDmRelayList({ relays: dmRelays, created_at: event.created_at });
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

  // Communikey
  useEffect(() => {
    if (!pubkey) return;

    const filter = {
      kinds: [COMMUNIKEY],
      authors: [pubkey],
      ...(communikey && communikey.created_at
        ? { since: communikey.created_at }
        : {}),
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
      const lastSeen = communikey ? communikey.created_at : 0;
      if (event.created_at && event.created_at > lastSeen) {
        setCommunikey(event.rawEvent() as NostrEvent);
      }
    });

    return () => sub.stop();
  }, [pubkey]);

  // Groups, contacts, media server, etc
  useEffect(() => {
    if (pubkey && relays.length > 0) {
      const filters = [
        {
          kinds: [NDKKind.SimpleGroupList],
          authors: [pubkey],
          since: groupList.created_at,
        },
        {
          kinds: [RELATIONSHIP],
          authors: [pubkey],
          //since: relationshipList.created_at,
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
            .map((t) => ({
              id: t[1],
              relay: t[2],
            }));
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
                .map((t) => ({
                  id: t[1],
                  relay: t[2],
                  isCommunity: t[3] === "community",
                }));
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
        } else if (event.kind === RELATIONSHIP) {
          const groupId = event.tags.find((t) => t[0] === "d")?.[1];
          const isMember =
            event.tags.find((t) => t[0] === "n" && t[1] === "follow") !==
            undefined;
          if (groupId && isMember) {
            // add to group list
            const c = await fetchCommunity(ndk, groupId);
            if (c) {
              setGroupList((groupList) => {
                const newGroups = groupList.groups.filter(
                  (g) => g.id !== groupId,
                );
                return {
                  ...groupList,
                  groups: [
                    ...newGroups,
                    { id: groupId, relay: c.relay, isCommunity: true },
                  ],
                };
              });
            }
          } else if (groupId) {
            // remove from group list
            setGroupList((groupList) => {
              const newGroups = groupList.groups.filter(
                (g) => g.id !== groupId,
              );
              return { ...groupList, groups: newGroups };
            });
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
        }
      });

      return () => sub.stop();
    }
  }, [pubkey, relays]);

  // Groups and messages
  useGroups(groupList.groups);
  useGroupMessages(groupList.groups);
  // Emoji sets
  useSyncEmojiSets();
  // Wallet
  useChachiWallet();
  // DMs
  useDirectMessages();
}

const authRoutes = ["/dm", "/wallet", "/settings", "/zaps"];

function isAuthRoute(pathname: string) {
  return (
    pathname === "/" || authRoutes.some((route) => pathname.startsWith(route))
  );
}

function NostrSync({ children }: { children: ReactNode }) {
  const loginMethod = localStorage.getItem("login-method");
  const [isLoggingIn, setIsLoggingIn] = useState(
    loginMethod && loginMethod !== "null",
  );
  const location = useLocation();
  const pubkey = usePubkey();
  useUserEvents({
    loginMethod,
    onLogin: () => {
      setIsLoggingIn(false);
    },
    onLoginFailed: () => {
      setIsLoggingIn(false);
    },
  });
  if (isLoggingIn) {
    return <LoadingScreen />;
  }
  if (!pubkey && isAuthRoute(location.pathname)) {
    return <Landing />;
  }
  return children;
}

export default function Layout() {
  return (
    <NostrSync>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </NostrSync>
  );
}
