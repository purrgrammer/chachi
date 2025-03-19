import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isEventUnpublished } from "@/lib/db";
import { toast } from "sonner";
import { useNDK } from "@/lib/ndk";
import { isRelayURL } from "@/lib/relay";
import { NDKEvent, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { cache } from "@/lib/db";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";

const UNPUBLISHED = "is-unpublished";

export function useIsUnpublished(eventId: string) {
  const { data: isUnpublished = false } = useQuery({
    queryKey: [UNPUBLISHED, eventId],
    queryFn: async () => isEventUnpublished(eventId),
    staleTime: Infinity,
  });

  return isUnpublished;
}

export function useRetryUnpublishedEvent() {
  const ndk = useNDK();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const retryEvent = useCallback(async (eventId: string) => {
    try {
      const unpublishedEvents = await cache.getUnpublishedEvents();
      const eventToRetry = unpublishedEvents.find(
        (e) => e.event.id === eventId && e.relays.filter(isRelayURL).length > 0,
      );

      if (!eventToRetry) {
        return false;
      }

      const ndkEvent = eventToRetry.event;
      const relaySet = NDKRelaySet.fromRelayUrls(
        eventToRetry.relays.filter(isRelayURL),
        ndk,
      );
      await ndkEvent.publish(relaySet);

      await cache.discardUnpublishedEvent(eventId);
      queryClient.invalidateQueries({ queryKey: [UNPUBLISHED, eventId] });

      toast.success(t("chat.message.retry.success"));
      return true;
    } catch (error) {
      console.error("Error retrying event publish:", error);
      toast.error(t("chat.message.retry.error"));
      return false;
    }
  }, []);

  return { retryEvent };
}

export function useAddUnpublishedEvent() {
  const queryClient = useQueryClient();
  return useCallback(
    async ({ event, relays }: { event: NDKEvent; relays: string[] }) => {
      console.log("UNPUB", { event: event.rawEvent(), relays });
      try {
        await cache.addUnpublishedEvent(event, relays);
        queryClient.invalidateQueries({ queryKey: [UNPUBLISHED, event.id] });
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );
}
