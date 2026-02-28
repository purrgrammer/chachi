import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RotateCw, File as FileIcon } from "lucide-react";
import { BlossomClient } from "blossom-client-sdk";
import { getEventHash, EventTemplate } from "nostr-tools";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMediaServers, UploadedBlob } from "@/lib/media";
import { useAccount } from "@/lib/account";
import { useNDK } from "@/lib/ndk";
import { getHost } from "@/lib/hooks";
import { formatFileSize, getFileExtension } from "@/lib/format";

interface UploadServerDialogProps {
  open: boolean;
  file: File | null;
  onOpenChange: (open: boolean) => void;
  onUpload: (blob: UploadedBlob) => void;
  uploadType?: "file" | "image" | "video";
}

export function UploadServerDialog({
  open,
  file,
  onOpenChange,
  onUpload,
  uploadType = "file",
}: UploadServerDialogProps) {
  const { t } = useTranslation();
  const servers = useMediaServers();
  const ndk = useNDK();
  const account = useAccount();
  const pubkey = account?.pubkey;

  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Initialize with first server selected by default
  useEffect(() => {
    if (open && servers.length > 0) {
      setSelectedServers([servers[0]]);
    }
  }, [open, servers]);

  // Create preview URL for images and videos
  useEffect(() => {
    if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const handleServerToggle = (server: string, checked: boolean) => {
    setSelectedServers((prev) =>
      checked ? [...prev, server] : prev.filter((s) => s !== server)
    );
  };

  const signer = useCallback(
    async (draft: EventTemplate) => {
      if (!pubkey) throw new Error("Not logged in");
      const event = { ...draft, pubkey };
      const sig = await ndk.signer!.sign(event);
      return { ...event, sig, id: getEventHash(event) };
    },
    [ndk.signer, pubkey]
  );

  const handleUpload = async () => {
    if (!file || selectedServers.length === 0) return;

    try {
      setIsUploading(true);

      const blob = new Blob([file], { type: file.type });
      const extension = getFileExtension(file);

      const auth = await BlossomClient.getUploadAuth(blob, signer, file.name);

      // Upload to all selected servers in parallel
      const uploadPromises = selectedServers.map(async (server) => {
        try {
          const result = await BlossomClient.uploadBlob(server, blob, auth);
          toast.success(
            t("settings.media.upload-success", { server: getHost(server) })
          );

          const type = result.type?.replace("quicktime", "mov") || "";
          const uploadedBlob: UploadedBlob = {
            ...result,
            type,
            extension,
          };

          return {
            server,
            success: true,
            result: uploadedBlob,
          };
        } catch (error) {
          console.error(`Upload failed for ${server}:`, error);
          toast.error(
            t("settings.media.upload-error", { server: getHost(server) })
          );

          return {
            server,
            success: false,
            error,
          };
        }
      });

      const results = await Promise.allSettled(uploadPromises);

      // Find first successful upload
      const firstSuccess = results
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .find((r) => r?.success);

      if (firstSuccess && firstSuccess.success && firstSuccess.result) {
        onUpload(firstSuccess.result);
        onOpenChange(false);
      } else {
        // All uploads failed
        toast.error(t("settings.media.upload-panic"));
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t("file.upload.error"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    if (!isUploading) {
      onOpenChange(false);
    }
  };

  if (!file) return null;

  const dialogTitle =
    uploadType === "image"
      ? t("image.upload.dialog.title")
      : uploadType === "video"
        ? t("video.upload-dialog.title")
        : t("file.upload.dialog.title");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose={isUploading}
        onPointerDownOutside={(e) => {
          if (isUploading) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isUploading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Preview */}
          {previewUrl && file.type.startsWith("image/") && (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-h-48 mx-auto rounded-lg object-contain"
            />
          )}

          {previewUrl && file.type.startsWith("video/") && (
            <video
              src={previewUrl}
              className="max-h-48 mx-auto rounded-lg"
              controls
            />
          )}

          {/* File Metadata */}
          <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
            <FileIcon className="size-8 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} • {file.type}
              </p>
            </div>
          </div>

          {/* Server Selection */}
          <div>
            <p className="text-sm font-medium mb-3">
              {t("file.upload.dialog.select_servers")}
            </p>
            <div className="space-y-3">
              {servers.map((server) => (
                <label
                  key={server}
                  className={`flex items-center space-x-3 ${
                    isUploading ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <Checkbox
                    checked={selectedServers.includes(server)}
                    onCheckedChange={(checked) =>
                      handleServerToggle(server, checked === true)
                    }
                    disabled={isUploading}
                  />
                  <div className="flex items-center space-x-2">
                    <img
                      src={`${server}/favicon.ico`}
                      alt=""
                      className="size-4"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className="text-sm font-medium">{getHost(server)}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
          >
            {t("file.upload.dialog.cancel_button")}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedServers.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <RotateCw className="animate-spin mr-2 h-4 w-4" />
                {t("file.upload.dialog.uploading")}
              </>
            ) : (
              t("file.upload.dialog.upload_button")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
