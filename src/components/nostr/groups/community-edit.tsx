import { useState, useRef, useEffect } from "react";
import {
  Settings,
  FileText,
  Plus,
  Trash2,
  GripVertical,
  Pencil,
  MapPin,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Reorder } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TabContainer, TabItem } from "@/components/ui/tab-container";
import {
  CommunityForm,
  CommunityFormValues,
  createCommunityEvent,
} from "@/components/nostr/groups/community-form";
import { useRelays } from "@/lib/nostr";
import { isRelayURL } from "@/lib/relay";
import type { Community } from "@/lib/types";
import { ContentKinds, ContentCategoryGroups } from "@/lib/constants/kinds";
import { COMMUNIKEY } from "@/lib/kinds";
import { usePublishEvent } from "@/lib/nostr/publishing";
import { MapPicker } from "@/components/map-picker";
import { PigeonMiniMap } from "@/components/map-pigeon-minimap";

interface ContentSection {
  name: string;
  kinds: number[];
}

// todo: optional description
// todo: optional reference to a terms of service event
// todo: optional location (human readable string)
// todo: optional coordinates (geohash)

export function CommunityEditor({
  pubkey,
  community,
}: {
  pubkey: string;
  community?: Community;
}) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const userRelays = useRelays();
  const userRelaysFiltered = userRelays.filter((r) => isRelayURL(r));
  const communityRelays = [
    community?.relay,
    ...(community?.backupRelays || []),
  ].filter((r): r is string => typeof r === "string" && isRelayURL(r));
  const allRelays = Array.from(
    new Set([...userRelaysFiltered, ...communityRelays]),
  );
  const publish = usePublishEvent();

  // Content section states
  const [contentSections, setContentSections] = useState<ContentSection[]>(
    community?.sections || [],
  );
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionKinds, setNewSectionKinds] = useState<number[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSection, setEditingSection] = useState<ContentSection | null>(
    null,
  );
  const [editSectionName, setEditSectionName] = useState("");
  const [editSectionKinds, setEditSectionKinds] = useState<number[]>([]);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const addSectionRef = useRef<HTMLDivElement>(null);

  // Metadata states
  const [description, setDescription] = useState(community?.description || "");
  const [location, setLocation] = useState(community?.location || "");
  const [geohash, setGeohash] = useState(community?.geohash || "");
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Effect to update form state when community prop changes
  useEffect(() => {
    if (community) {
      setDescription(community.description || "");
      setLocation(community.location || "");
      setGeohash(community.geohash || "");
      setContentSections(community.sections || []);
    } else {
      // Reset if community becomes undefined (e.g., navigating away)
      setDescription("");
      setLocation("");
      setGeohash("");
      setContentSections([]);
    }
  }, [community]); // Rerun when the community object changes

  useEffect(() => {
    if (showAddSection && addSectionRef.current) {
      addSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [showAddSection]);

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
      await publish(event, allRelays);
      toast.success(t("community.edit.success"));
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

      // Build tags array
      const tags: string[][] = [["r", community.relay]];
      community.backupRelays?.forEach((r) => tags.push(["r", r]));
      community.blossom?.forEach((r) => tags.push(["blossom", r]));
      if (community.mint) tags.push(["mint", community.mint, "cashu"]);

      // For each content section, add the appropriate tags
      contentSections.forEach((section) => {
        // Add a content tag with the section name
        tags.push(["content", section.name]);

        // Add a k tag for each kind
        section.kinds.forEach((kind) => {
          tags.push(["k", kind.toString()]);
        });
      });

      // Create and publish event
      const template = {
        kind: COMMUNIKEY,
        content: "",
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };
      await publish(template, allRelays);
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

    setContentSections([...contentSections, newSection]);
    setNewSectionName("");
    setNewSectionKinds([]);
    setEditingSection(null);
  }

  function removeContentSection(name: string) {
    setContentSections(
      contentSections.filter((section) => section.name !== name),
    );
  }

  function handleEditSection(section: ContentSection) {
    setEditingSection(section);
    setEditSectionName(section.name);
    setEditSectionKinds([...section.kinds]);
  }

  function handleSaveEdit() {
    if (!editingSection) return;

    const updatedSections = contentSections.map((section) => {
      if (section.name === editingSection.name) {
        return {
          name: editSectionName.trim(),
          kinds: editSectionKinds,
        };
      }
      return section;
    });

    setContentSections(updatedSections);
    setEditingSection(null);
    setEditSectionName("");
    setEditSectionKinds([]);
  }

  function toggleEditKindSelection(kind: number) {
    if (editSectionKinds.includes(kind)) {
      setEditSectionKinds(editSectionKinds.filter((k) => k !== kind));
    } else {
      setEditSectionKinds([...editSectionKinds, kind]);
    }
  }

  async function handleSaveMetadata() {
    if (!community) return;

    try {
      setIsMetadataLoading(true);

      // Build tags array
      const tags: string[][] = [["r", community.relay]];

      community.backupRelays?.forEach((r) => tags.push(["r", r]));
      community.blossom?.forEach((r) => tags.push(["blossom", r]));
      if (community.mint) tags.push(["mint", community.mint, "cashu"]);

      // Note: Using the `contentSections` state ensures the latest order is saved
      contentSections.forEach((section) => {
        tags.push(["content", section.name]);
        section.kinds.forEach((kind) => {
          tags.push(["k", kind.toString()]);
        });
      });

      if (description) tags.push(["description", description]);
      if (location) tags.push(["location", location]);
      if (geohash) tags.push(["g", geohash]);

      // Create and publish event
      const template = {
        kind: COMMUNIKEY,
        content: "",
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };
      await publish(template, allRelays);
      toast.success(t("community.edit.metadata.success"));
    } catch (err) {
      console.error("Error saving metadata:", err);
      toast.error(t("community.edit.metadata.error"));
    } finally {
      setIsMetadataLoading(false);
    }
  }

  const tabs: TabItem[] = [
    {
      id: "metadata",
      name: t("community.edit.metadata.tab"),
      icon: <Info className="h-4 w-4" />,
      children: (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("community.edit.metadata.description")} (
                {t("community.edit.metadata.optional")})
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  "community.edit.metadata.description_placeholder",
                )}
                className="min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("community.edit.metadata.location")} (
                {t("community.edit.metadata.optional")})
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("community.edit.metadata.location_placeholder")}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("community.edit.metadata.coordinates")} (
                {t("community.edit.metadata.optional")})
              </label>
              <div className="flex gap-2">
                <Input
                  value={geohash}
                  readOnly
                  placeholder={t(
                    "community.edit.metadata.coordinates_placeholder",
                  )}
                  className={geohash ? "bg-muted" : ""}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowMapPicker(true)}
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {geohash && (
                <div className="my-2">
                  <PigeonMiniMap geohash={geohash} />
                </div>
              )}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleSaveMetadata}
            disabled={isMetadataLoading}
          >
            {isMetadataLoading
              ? t("community.edit.metadata.saving")
              : t("community.edit.metadata.save")}
          </Button>
        </div>
      ),
    },
    {
      id: "settings",
      name: t("community.edit.settings"),
      icon: <Settings className="h-4 w-4" />,
      children: (
        <CommunityForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          initialValues={extractFormValues(community)}
          submitLabel={t("community.edit.submit")}
        />
      ),
    },
    {
      id: "content",
      name: t("community.edit.content"),
      icon: <FileText className="h-4 w-4" />,
      children: (
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              {t("community.edit.content_section.sections")}
            </h3>
            <ScrollArea className="h-[300px]">
              <div className="flex flex-col gap-2">
                {contentSections.length > 0 ? (
                  <Reorder.Group
                    axis="y"
                    values={contentSections}
                    onReorder={setContentSections}
                    className="flex flex-col gap-2"
                  >
                    {contentSections.map((section) => (
                      <Reorder.Item
                        key={section.name}
                        value={section}
                        as="div"
                        className="border rounded-lg p-3 flex flex-col gap-2"
                      >
                        {editingSection?.name === section.name ? (
                          <div className="flex flex-col gap-3">
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                {t("community.edit.content_section.name")}
                              </label>
                              <Input
                                value={editSectionName}
                                onChange={(e) =>
                                  setEditSectionName(e.target.value)
                                }
                                placeholder={t(
                                  "community.edit.content_section.name_placeholder",
                                )}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                {t("community.edit.content_section.kinds")}
                              </label>
                              <div className="flex flex-col gap-3 mt-1">
                                {ContentCategoryGroups.map((category) => (
                                  <div
                                    key={category.id}
                                    className="flex flex-col gap-2"
                                  >
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                      {category.icon}
                                      <span>{category.name}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 ml-6">
                                      {category.kinds.map((kind) => {
                                        const kindInfo = ContentKinds.find(
                                          (k) => k.kind === kind,
                                        );
                                        if (!kindInfo) return null;
                                        return (
                                          <Badge
                                            key={kind}
                                            variant={
                                              editSectionKinds.includes(kind)
                                                ? "default"
                                                : "outline"
                                            }
                                            className="cursor-pointer flex items-center gap-1"
                                            onClick={() =>
                                              toggleEditKindSelection(kind)
                                            }
                                          >
                                            {kindInfo.icon}
                                            <span>
                                              {t(kindInfo.translationKey)}
                                            </span>
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setEditingSection(null)}
                              >
                                {t("community.edit.cancel")}
                              </Button>
                              <Button
                                onClick={handleSaveEdit}
                                disabled={
                                  !editSectionName.trim() ||
                                  editSectionKinds.length === 0
                                }
                              >
                                {t("community.edit.save")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                <h4 className="font-medium">{section.name}</h4>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditSection(section)}
                                  className="h-6 w-6"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    removeContentSection(section.name)
                                  }
                                  className="h-6 w-6 text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
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
                          </>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("community.edit.content_section.empty")}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddSection(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("community.edit.content_section.add")}
                </Button>

                {showAddSection && (
                  <div ref={addSectionRef} className="border rounded-lg p-4">
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
                          {t("community.edit.content_section.kinds")}
                        </label>
                        <div className="flex flex-col gap-3 mt-1">
                          {ContentCategoryGroups.map((category) => (
                            <div
                              key={category.id}
                              className="flex flex-col gap-2"
                            >
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                {category.icon}
                                <span>{category.name}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 ml-6">
                                {category.kinds.map((kind) => {
                                  const kindInfo = ContentKinds.find(
                                    (k) => k.kind === kind,
                                  );
                                  if (!kindInfo) return null;
                                  return (
                                    <Badge
                                      key={kind}
                                      variant={
                                        newSectionKinds.includes(kind)
                                          ? "default"
                                          : "outline"
                                      }
                                      className="cursor-pointer flex items-center gap-1"
                                      onClick={() => toggleKindSelection(kind)}
                                    >
                                      {kindInfo.icon}
                                      <span>{t(kindInfo.translationKey)}</span>
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAddSection(false);
                            setNewSectionName("");
                            setNewSectionKinds([]);
                          }}
                        >
                          {t("community.edit.cancel")}
                        </Button>
                        <Button
                          onClick={() => {
                            addContentSection();
                            setShowAddSection(false);
                          }}
                          disabled={
                            !newSectionName.trim() ||
                            newSectionKinds.length === 0
                          }
                        >
                          {t("community.edit.add_button")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <Button
            className="w-full"
            onClick={handleSaveContentSections}
            disabled={contentSections.length === 0 || isContentLoading}
          >
            {isContentLoading
              ? t("community.edit.content_section.saving")
              : t("community.edit.content_section.save")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <TabContainer tabs={tabs} defaultTab="settings" className="mb-2" />

      <MapPicker
        open={showMapPicker}
        onOpenChange={setShowMapPicker}
        onSelect={setGeohash}
        initialGeohash={geohash}
      />
    </>
  );
}

export function CommunityEdit({
  pubkey,
  community,
}: {
  pubkey: string;
  community?: Community;
}) {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);

  function onOpenChange(open: boolean) {
    setShowDialog(open);
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
        <CommunityEditor pubkey={pubkey} community={community} />
      </DialogContent>
    </Dialog>
  );
}
