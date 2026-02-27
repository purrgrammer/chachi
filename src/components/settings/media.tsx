import { Link } from "react-router-dom";
import { Trash2, Plus, Server, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFavicon } from "@/lib/hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import { mediaServerListAtom } from "@/app/store";
import { usePublishBlossomList } from "@/lib/nostr/publishing";

function MediaServer({
  server,
  canRemove,
  onRemove,
}: {
  server: string;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const favicon = useFavicon(server);
  return (
    <div className="flex flex-row items-center justify-between py-1">
      <div className="flex flex-row items-center gap-2">
        {favicon && (
          <img
            src={favicon}
            alt={server}
            className="size-4"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <Link
          to={server}
          className="text-sm font-mono hover:underline hover:decoration-dotted"
        >
          {server}
        </Link>
      </div>
      <Button
        disabled={!canRemove}
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onRemove}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}

function MediaServerList({
  servers,
  className,
}: {
  servers: string[];
  className?: string;
}) {
  const { t } = useTranslation();
  const [mediaServerList, setMediaServerList] = useAtom(mediaServerListAtom);
  const [isSaving, setIsSaving] = useState(false);
  const publishBlossomList = usePublishBlossomList();

  async function saveMediaServerList(servers: string[]) {
    try {
      setIsSaving(true);
      const publishedEvent = await publishBlossomList(servers);
      console.log("SAVE MEDIA SERVER LIST", servers, publishedEvent);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  function addServer(server: string) {
    const newServers = [...mediaServerList.servers, server];
    saveMediaServerList(newServers);
    setMediaServerList({
      ...mediaServerList,
      servers: newServers,
    });
  }

  function removeServer(server: string) {
    const newServers = mediaServerList.servers.filter((s) => s !== server);
    saveMediaServerList(newServers);
    setMediaServerList({
      ...mediaServerList,
      servers: newServers,
    });
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-1">
        {servers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("settings.media.no-servers")}
          </p>
        )}
        {servers.map((server) => (
          <MediaServer
            key={server}
            server={server}
            canRemove={servers.length > 1}
            onRemove={() => removeServer(server)}
          />
        ))}
      </div>
      <AddServerForm isSaving={isSaving} onAdd={addServer} />
    </div>
  );
}

function AddServerForm({
  isSaving,
  onAdd,
}: {
  isSaving: boolean;
  onAdd: (server: string) => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Ensure URL starts with https://
      const fullUrl = url.startsWith("https://") ? url : `https://${url}`;

      // Validate URL
      new URL(fullUrl);

      setUrl("");
      onAdd(fullUrl);
    } catch {
      setError(t("settings.media.invalid-url"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-row gap-2">
        <Input
          type="text"
          placeholder={t("settings.media.server-url")}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          className="flex-1"
        />
        <Button type="submit" disabled={isSaving}>
          <div className="flex flex-row items-center gap-2">
            {isSaving ? (
              <RotateCcw className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t("settings.media.add-server")}
          </div>
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

export function Media() {
  const { t } = useTranslation();
  const [mediaServerList] = useAtom(mediaServerListAtom);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-row gap-1.5 items-center">
              <Server className="size-4 text-muted-foreground" />
              <h3 className="text-sm uppercase font-light text-muted-foreground">
                {t("settings.media.servers")}
              </h3>
            </div>
            <p className="text-xs">{t("settings.media.description")}</p>
          </div>
          <MediaServerList servers={mediaServerList.servers} />
        </div>
      </div>
    </>
  );
}
