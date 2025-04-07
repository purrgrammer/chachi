import { useState } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CommunityForm,
  CommunityFormValues,
  createCommunityEvent,
} from "@/components/nostr/groups/community-form";
import { useNDK } from "@/lib/ndk";
import { useRelays, useRelaySet } from "@/lib/nostr";
import { isRelayURL } from "@/lib/relay";
import { useCommunity } from "@/lib/nostr/groups";
import type { Community } from "@/lib/types";

export function CommunityEdit({ pubkey }: { pubkey: string }) {
  const { t } = useTranslation();
  const ndk = useNDK();
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { data: community } = useCommunity(pubkey);
  const userRelays = useRelays();
  const relaySet = useRelaySet(userRelays.filter((r) => isRelayURL(r)));

  function onOpenChange(open: boolean) {
    setShowDialog(open);
  }

  function extractFormValues(
    community?: Community,
  ): Partial<CommunityFormValues> {
    if (!community) return {};

    // Extract relay values
    const backupRelays = community.backupRelays || [];
    const primaryRelay = community.relay;

    // Extract blossom server values
    const blossomServers = community.blossom || [];
    const primaryBlossomServer =
      blossomServers.length > 0 ? blossomServers[0] : undefined;
    const backupBlossomServers =
      blossomServers.length > 1 ? blossomServers.slice(1) : [];

    return {
      relay: primaryRelay,
      backupRelays,
      primaryBlossomServer,
      backupBlossomServers,
      communityMint: community.mint,
    };
  }

  async function handleSubmit(values: CommunityFormValues) {
    try {
      setIsLoading(true);
      const event = createCommunityEvent(values, pubkey);
      const ndkEvent = new NDKEvent(ndk, event as NostrEvent);
      await ndkEvent.publish(relaySet);
      toast.success(t("community.edit.success"));
      setShowDialog(false);
    } catch (err) {
      console.error(err);
      toast.error(t("community.edit.error"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("community.edit.title")}</DialogTitle>
        </DialogHeader>
        <CommunityForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          initialValues={extractFormValues(community)}
          submitLabel={t("community.edit.submit")}
        />
      </DialogContent>
    </Dialog>
  );
}
