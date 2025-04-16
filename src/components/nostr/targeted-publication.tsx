import { useState, ReactNode, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { NostrEvent } from "nostr-tools";
import {
  NDKEvent,
  NDKRelaySet,
  NDKSubscriptionCacheUsage,
} from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useNDK } from "@/lib/ndk";
import { Embed } from "@/components/nostr/detail";
import { useCanSign } from "@/lib/account";
import { Button } from "@/components/ui/button";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";
import { TARGETED_PUBLICATION } from "@/lib/kinds";
import { debounce } from "lodash";
import { useMyGroups } from "@/lib/groups";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Name } from "@/components/nostr/name";
import { Avatar } from "@/components/nostr/avatar";
import { useRelays } from "@/lib/nostr";
import { ARef, ERef } from "@/components/nostr/event";

export function NewPublication({
  group,
  children,
  onSuccess,
}: {
  group?: Group;
  children?: ReactNode;
  onSuccess?: (ev: NostrEvent) => void;
}) {
  const ndk = useNDK();
  const [inputValue, setInputValue] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [parsedEvent, setParsedEvent] = useState<{
    id?: string;
    kind?: number;
    pubkey?: string;
    relays?: string[];
    identifier?: string;
  } | null>(null);
  const userRelays = useRelays();
  const [fetchedEvent, setFetchedEvent] = useState<NDKEvent | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedCommunities, setSelectedCommunities] = useState<Group[]>(
    group ? [group] : [],
  );
  const canSign = useCanSign();
  const { t } = useTranslation();
  const allGroups = useMyGroups();
  const communities = allGroups.filter((g) => g.isCommunity);

  function onOpenChange(open: boolean) {
    setShowDialog(open);
    if (!open) {
      setInputValue("");
      setParsedEvent(null);
      setFetchedEvent(null);
      setFetchError(null);
      setSelectedCommunities([]);
    }
  }

  const parseInput = useCallback(
    debounce(() => {
      // Reset states when parsing starts
      setFetchedEvent(null);
      setFetchError(null);

      if (!inputValue.trim()) {
        setParsedEvent(null);
        return;
      }

      try {
        // Try to decode the input as a NIP-19 identifier
        const decoded = nip19.decode(inputValue.trim().replace(/^nostr:/, ""));

        if (decoded.type === "note") {
          // It's a note (event) reference
          setParsedEvent({ id: decoded.data });
        } else if (decoded.type === "nevent") {
          // It's an extended event reference with additional data
          const eventData = decoded.data as {
            id?: string;
            kind?: number;
            pubkey?: string;
            relays?: string[];
          };
          setParsedEvent({
            id: eventData.id,
            kind: eventData.kind,
            pubkey: eventData.pubkey,
            relays: eventData.relays,
          });
        } else if (decoded.type === "naddr") {
          // It's an address reference
          const addrData = decoded.data as {
            identifier: string;
            relays?: string[];
            pubkey: string;
            kind: number;
          };
          setParsedEvent({
            identifier: addrData.identifier,
            relays: addrData.relays || [],
            pubkey: addrData.pubkey,
            kind: addrData.kind,
          });
        } else {
          setParsedEvent(null);
        }
      } catch {
        // Not a valid NIP-19 identifier
        setParsedEvent(null);
      }
    }, 300),
    [inputValue],
  );

  // Trigger parsing when input changes
  useEffect(() => {
    parseInput();
    return () => parseInput.cancel();
  }, [inputValue, parseInput]);

  // Fetch the event when parsedEvent changes
  useEffect(() => {
    if (!parsedEvent || !ndk) {
      setFetchedEvent(null);
      return;
    }

    const fetchEvent = async () => {
      setIsFetching(true);
      setFetchError(null);

      try {
        let event;

        if (parsedEvent.id) {
          // For note or nevent
          const filter = {
            ids: [parsedEvent.id],
            ...(parsedEvent.kind ? { kinds: [parsedEvent.kind] } : {}),
            ...(parsedEvent.pubkey ? { authors: [parsedEvent.pubkey] } : {}),
          };

          // Use relays from the parsed event if available
          const targetRelays = parsedEvent.relays?.length
            ? parsedEvent.relays
            : userRelays;

          const eventRelaySet =
            targetRelays.length > 0
              ? NDKRelaySet.fromRelayUrls(targetRelays, ndk)
              : undefined;

          event = await ndk.fetchEvent(
            filter,
            {
              cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
              groupable: false,
              closeOnEose: true,
            },
            eventRelaySet,
          );
        } else if (
          parsedEvent.identifier &&
          parsedEvent.pubkey &&
          parsedEvent.kind
        ) {
          // For naddr
          const filter = {
            kinds: [parsedEvent.kind],
            authors: [parsedEvent.pubkey],
            "#d": [parsedEvent.identifier],
          };

          const targetRelays = parsedEvent.relays?.length
            ? parsedEvent.relays
            : userRelays;

          const eventRelaySet =
            targetRelays.length > 0
              ? NDKRelaySet.fromRelayUrls(targetRelays, ndk)
              : undefined;

          event = await ndk.fetchEvent(
            filter,
            {
              cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
              groupable: false,
              closeOnEose: true,
            },
            eventRelaySet,
          );
        }

        if (event) {
          setFetchedEvent(event);
        } else {
          setFetchError(t("community.targeted-publication.event-not-found"));
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        setFetchError(t("community.targeted-publication.fetch-error"));
      } finally {
        setIsFetching(false);
      }
    };

    fetchEvent();
  }, [parsedEvent]);

  const toggleCommunity = (community: Group) => {
    setSelectedCommunities((prev) => {
      const isSelected = prev.some((c) => c.id === community.id);
      if (isSelected) {
        return prev.filter((c) => c.id !== community.id);
      } else {
        return [...prev, community];
      }
    });
  };

  async function poast() {
    try {
      if (isPosting || !fetchedEvent || selectedCommunities.length === 0)
        return;

      setIsPosting(true);

      const ev = new NDKEvent(ndk, {
        kind: TARGETED_PUBLICATION,
        content: "",
        tags: [
          ["d", fetchedEvent.id],
          ["k", fetchedEvent.kind!.toString()],
          ["p", fetchedEvent.pubkey],
          fetchedEvent.tagReference(),
          ...selectedCommunities.map((community) => [
            "h",
            community.id,
            community.relay,
          ]),
        ],
      } as NostrEvent);

      // Create a relay set from all selected communities and outbox relays
      const targetRelays = [
        ...new Set(selectedCommunities.map((c) => c.relay).concat(userRelays)),
      ];
      const publicationRelaySet =
        targetRelays.length > 0
          ? NDKRelaySet.fromRelayUrls(targetRelays, ndk)
          : NDKRelaySet.fromRelayUrls(userRelays, ndk);

      await ev.publish(publicationRelaySet);
      toast.success(t("community.targeted-publication.success"));
      onSuccess?.(ev.rawEvent() as NostrEvent);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(t("community.targeted-publication.error"));
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            className="w-full 
         w-[calc(100vw-2rem)] sm:w-[420px] md:w-[510px] 
          "
            disabled={!canSign}
          >
            <Share2 /> {t("community.targeted-publication.new")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("community.targeted-publication.new")}</DialogTitle>
          <DialogDescription>
            {t("community.targeted-publication.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {fetchedEvent ? (
            <Embed
              event={fetchedEvent?.rawEvent() as NostrEvent}
              group={group}
              relays={parsedEvent?.relays || []}
            />
          ) : (
            <Textarea
              placeholder={t("community.targeted-publication.enter-nip19")}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full"
              disabled={isFetching}
            />
          )}
          {isFetching && (
            <p className="mt-2 text-sm text-amber-600">
              {t("community.targeted-publication.loading")}
            </p>
          )}
          {fetchError && (
            <p className="mt-2 text-sm text-red-600">{fetchError}</p>
          )}

          {fetchedEvent && communities.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>
                  {t("community.targeted-publication.select-communities")}
                </CardTitle>
                <CardDescription>
                  {t("community.targeted-publication.select-communities-desc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {communities.map((community) => (
                    <div
                      key={community.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`community-${community.id}`}
                        checked={selectedCommunities.some(
                          (c) => c.id === community.id,
                        )}
                        onCheckedChange={() => toggleCommunity(community)}
                      />
                      <Label
                        htmlFor={`community-${community.id}`}
                        className="flex items-center cursor-pointer"
                      >
                        <div className="flex items-center gap-1">
                          <Avatar pubkey={community.id} className="w-4 h-4" />
                          <Name pubkey={community.id} />
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={poast}
            disabled={
              isPosting || !fetchedEvent || selectedCommunities.length === 0
            }
          >
            {isPosting
              ? t("community.targeted-publication.posting")
              : t("community.targeted-publication.post")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TargetedPublication({ event }: { event: NostrEvent }) {
  const eRef = event.tags.find((t) => t[0] === "e");
  const aRef = event.tags.find((t) => t[0] === "a");
  if (eRef) {
    return <ERef id={eRef[1]} relays={eRef[2] ? [eRef[2]] : []} inline />;
  }
  if (aRef) {
    return <ARef address={aRef[1]} relays={aRef[2] ? [aRef[2]] : []} inline />;
  }
  return null;
}
