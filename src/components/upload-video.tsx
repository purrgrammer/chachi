import { useState } from "react";
import { Video, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadedBlob } from "@/lib/media";
import { useTranslation } from "react-i18next";
import { UploadServerDialog } from "@/components/upload-server-dialog";
import { useAccount } from "@/lib/account";

type ButtonProps = React.ComponentProps<typeof Button>;

interface UploadVideoProps extends ButtonProps {
  onUpload: (blob: UploadedBlob) => void;
}

export function UploadVideo({ onUpload, ...props }: UploadVideoProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const account = useAccount();
  const canSign = account?.pubkey && !account.isReadOnly;
  const { t } = useTranslation();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setDialogOpen(true);

    // Reset input to allow re-selecting same file
    e.target.value = "";
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setSelectedFile(null);
  }

  function handleUploadComplete(blob: UploadedBlob) {
    onUpload(blob);
    handleDialogClose();
  }

  return (
    <>
      <div className="flex flex-row gap-2 justify-center items-center space-around">
        <input
          type="file"
          id="video-upload"
          className="hidden"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={!canSign}
        />

        <Button
          disabled={!canSign}
          variant="action"
          onClick={() => document.getElementById("video-upload")?.click()}
          size="huge"
          className="border"
          aria-label={t("aria.upload-video")}
          {...props}
        >
          <FileVideo />
          <span>{t("video.upload")}</span>
        </Button>

        <Button disabled variant="action" size="huge" className="border">
          <Video />
          <span>{t("video.record")}</span>
        </Button>
      </div>

      <UploadServerDialog
        open={dialogOpen}
        file={selectedFile}
        onOpenChange={setDialogOpen}
        onUpload={handleUploadComplete}
        uploadType="video"
      />
    </>
  );
}
