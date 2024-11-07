import { useAtom, useAtomValue } from "jotai";
import { ReactNode, useEffect } from "react";
import { Outlet } from "react-router-dom";
import {
  NDKKind,
  NDKSubscriptionCacheUsage,
  NDKRelaySet,
  NDKNip07Signer,
} from "@nostr-dev-kit/ndk";
import { useNDK, outboxRelayUrls } from "@/lib/ndk";
import {
  accountAtom,
  relayListAtom,
  relaysAtom,
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

function useUserEvents() {
  const ndk = useNDK();
  const [account, setAccount] = useAtom(accountAtom);
  const pubkey = account?.pubkey;
  const relays = useAtomValue(relaysAtom);
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
        cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
        closeOnEose: false,
      },
      NDKRelaySet.fromRelayUrls(outboxRelayUrls, ndk),
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

  // Groups, contacts, media server and emoji list
  useEffect(() => {
    if (pubkey && relays.length > 0) {
      const sub = ndk.subscribe(
        {
          kinds: [
            NDKKind.SimpleGroupList,
            NDKKind.Contacts,
            NDKKind.BlossomList,
            NDKKind.EmojiList,
          ],
          authors: [pubkey],
        },
        {
          cacheUsage: NDKSubscriptionCacheUsage.PARALLEL,
          closeOnEose: false,
        },
        NDKRelaySet.fromRelayUrls(
          relays.map((r) => r.url),
          ndk,
        ),
      );

      sub.on("event", (event) => {
        if (event.kind === NDKKind.SimpleGroupList) {
          const userGroups = event.tags
            .filter((t) => t[0] === "group" && t[1] && t[2] && isRelayURL(t[2]))
            .map((t) => ({ id: t[1], relay: t[2] }));
          if (
            event.created_at &&
            event.created_at > (groupList.created_at || 0)
          ) {
            setGroupList({
              groups: userGroups,
              content: event.content,
              created_at: event.created_at,
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
}

function NostrSync({ children }: { children: ReactNode }) {
  useUserEvents();
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
