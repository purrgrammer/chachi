import { useState } from "react";
import { Settings, FileText, Plus, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { NostrEvent } from "nostr-tools";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { ContentKinds } from "@/lib/constants/kinds";
import { COMMUNIKEY } from "@/lib/kinds";

interface ContentSection {
  name: string;
  kinds: number[];
  fee?: number;
}

export function CommunityEdit({ pubkey }: { pubkey: string }) {
  const { t } = useTranslation();
  const ndk = useNDK();
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  const { data: community } = useCommunity(pubkey);
  const userRelays = useRelays();
  const relaySet = useRelaySet(userRelays.filter((r) => isRelayURL(r)));

  // Content section states
  const [contentSections, setContentSections] = useState<ContentSection[]>(
    community?.sections || [],
  );
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionKinds, setNewSectionKinds] = useState<number[]>([]);
  const [newSectionFee, setNewSectionFee] = useState<string>("");
  const [accordionValue, setAccordionValue] = useState<string | undefined>(
    undefined,
  );
  const [isContentLoading, setIsContentLoading] = useState(false);

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

  async function handleSaveContentSections() {
    if (contentSections.length === 0) {
      toast.info(t("community.edit.content_section.empty"));
      return;
    }
    if (!community) return;

    try {
      setIsContentLoading(true);
      // Create a base event for the content sections
      const event = new NDKEvent(ndk, {
        kind: COMMUNIKEY,
        tags: [["r", community.relay]],
      } as NostrEvent);
      community.backupRelays?.forEach((r) => event.tags.push(["r", r]));
      community.blossom?.forEach((r) => event.tags.push(["blossom", r]));
      if (community.mint) event.tags.push(["mint", community.mint, "cashu"]);

      // For each content section, add the appropriate tags
      contentSections.forEach((section) => {
        // Add a content tag with the section name
        event.tags.push(["content", section.name]);

        // Add a k tag for each kind
        section.kinds.forEach((kind) => {
          event.tags.push(["k", kind.toString()]);
        });

        // Add a fee tag if a fee is set
        if (section.fee !== undefined) {
          event.tags.push(["fee", section.fee.toString()]);
        }
      });

      // Sign and publish the event
      await event.publish(relaySet);
      toast.success(t("community.edit.content_section.success"));
    } catch (err) {
      console.error("Error saving content sections:", err);
      toast.error(t("community.edit.content_section.error"));
    } finally {
      setIsContentLoading(false);
    }
  }

  function toggleKindSelection(kind: number) {
    if (newSectionKinds.includes(kind)) {
      setNewSectionKinds(newSectionKinds.filter((k) => k !== kind));
    } else {
      setNewSectionKinds([...newSectionKinds, kind]);
    }
  }

  function addContentSection() {
    if (!newSectionName.trim() || newSectionKinds.length === 0) {
      return;
    }

    const newSection: ContentSection = {
      name: newSectionName.trim(),
      kinds: newSectionKinds,
    };

    if (newSectionFee && !isNaN(Number(newSectionFee))) {
      newSection.fee = Number(newSectionFee);
    }

    setContentSections([...contentSections, newSection]);
    setNewSectionName("");
    setNewSectionKinds([]);
    setNewSectionFee("");
    setAccordionValue(undefined);
  }

  function removeContentSection(name: string) {
    setContentSections(
      contentSections.filter((section) => section.name !== name),
    );
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t("community.edit.settings")}
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("community.edit.content")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="settings">
            <CommunityForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              initialValues={extractFormValues(community)}
              submitLabel={t("community.edit.submit")}
            />
          </TabsContent>
          <TabsContent value="content" className="pt-2">
            <div className="flex flex-col gap-4">
              <Accordion
                type="single"
                collapsible
                value={accordionValue}
                onValueChange={setAccordionValue}
                className="border rounded-lg"
              >
                <AccordionItem value="add-section" className="border-none">
                  <AccordionTrigger className="px-4 py-2 hover:bg-muted/50 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">
                        {t("community.edit.content_section.add")}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 px-4 pb-4">
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          {t("community.edit.content_section.name")}
                        </label>
                        <Input
                          value={newSectionName}
                          onChange={(e) => setNewSectionName(e.target.value)}
                          placeholder={t(
                            "community.edit.content_section.name_placeholder",
                          )}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          {t("community.edit.content_section.fee")} (
                          {t("community.edit.content_section.optional")})
                        </label>
                        <Input
                          value={newSectionFee}
                          onChange={(e) => setNewSectionFee(e.target.value)}
                          placeholder={t(
                            "community.edit.content_section.fee_placeholder",
                          )}
                          type="number"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          {t("community.edit.content_section.kinds")}
                        </label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {ContentKinds.map((kind) => (
                            <Badge
                              key={kind.kind}
                              variant={
                                newSectionKinds.includes(kind.kind)
                                  ? "default"
                                  : "outline"
                              }
                              className="cursor-pointer flex items-center gap-1"
                              onClick={() => toggleKindSelection(kind.kind)}
                            >
                              {kind.icon}
                              <span>{t(kind.translationKey)}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={addContentSection}
                        className="mt-2"
                        disabled={
                          !newSectionName.trim() || newSectionKinds.length === 0
                        }
                      >
                        {t("community.edit.content_section.add_button")}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {contentSections.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium">
                    {t("community.edit.content_section.sections")}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {contentSections.map((section) => (
                      <div
                        key={section.name}
                        className="border rounded-lg p-3 flex flex-col gap-2"
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{section.name}</h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeContentSection(section.name)}
                            className="h-6 w-6 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {section.fee !== undefined && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>{section.fee}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {section.kinds.map((kind) => {
                            const kindInfo = ContentKinds.find(
                              (k) => k.kind === kind,
                            );
                            return (
                              <Badge
                                key={kind}
                                variant="secondary"
                                className="text-xs"
                              >
                                {kindInfo?.icon}
                                <span className="ml-1">
                                  {t(kindInfo?.translationKey || "")}
                                </span>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t("community.edit.content_section.empty")}
                </div>
              )}

              <Button
                className="w-full mt-2"
                onClick={handleSaveContentSections}
                disabled={contentSections.length === 0 || isContentLoading}
              >
                {isContentLoading
                  ? t("community.edit.content_section.saving")
                  : t("community.edit.content_section.save")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
