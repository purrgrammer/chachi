import { useState } from "react";
import { Paperclip, FileLock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadedBlob } from "@/lib/media";
import { useTranslation } from "react-i18next";
import { UploadServerDialog } from "@/components/upload-server-dialog";
import { useAccount } from "@/lib/account";

type ButtonProps = React.ComponentProps<typeof Button>;

interface UploadFileProps extends ButtonProps {
  onUpload: (blob: UploadedBlob) => void;
}

export function UploadFile({ onUpload, ...props }: UploadFileProps) {
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
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileSelect}
        disabled={!canSign}
      />

      <Button
        disabled={!canSign}
        variant="action"
        size="icon"
        onClick={() => document.getElementById("file-upload")?.click()}
        aria-label={t("aria.upload-file")}
        {...props}
      >
        <Paperclip className="text-muted-foreground" />
      </Button>

      <UploadServerDialog
        open={dialogOpen}
        file={selectedFile}
        onOpenChange={setDialogOpen}
        onUpload={handleUploadComplete}
        uploadType="file"
      />
    </>
  );
}

export function UploadEncryptedFile({ onUpload, ...props }: UploadFileProps) {
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
      <input
        type="file"
        id="encrypted-file-upload"
        className="hidden"
        onChange={handleFileSelect}
        disabled={!canSign}
      />

      <Button
        disabled={!canSign}
        variant="action"
        size="icon"
        onClick={() => document.getElementById("encrypted-file-upload")?.click()}
        aria-label={t("aria.upload-file")}
        {...props}
      >
        <FileLock className="text-muted-foreground" />
      </Button>

      <UploadServerDialog
        open={dialogOpen}
        file={selectedFile}
        onOpenChange={setDialogOpen}
        onUpload={handleUploadComplete}
        uploadType="file"
      />
    </>
  );
}
