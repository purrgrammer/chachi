import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadedBlob } from "@/lib/media";
import { useTranslation } from "react-i18next";
import { UploadServerDialog } from "@/components/upload-server-dialog";
import { useAccount } from "@/lib/account";

interface UploadImageProps {
  defaultImage?: string;
  onUpload: (url: UploadedBlob) => void;
}

export function UploadImage({ defaultImage, onUpload }: UploadImageProps) {
  const [image, setImage] = useState<string | undefined>(defaultImage);
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
    setImage(blob.url);
    onUpload(blob);
    handleDialogClose();
  }

  return (
    <>
      <input
        type="file"
        id="image-upload"
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={!canSign}
      />

      <Button
        disabled={!canSign}
        className={`bg-accent hover:bg-accent hover:text-foreground size-24 rounded-full text-muted-foreground [&_svg]:size-10 ${image ? "p-0" : ""} gap-0`}
        onClick={() => document.getElementById("image-upload")?.click()}
        type="button"
        aria-label={t("aria.upload-image")}
      >
        {image ? (
          <img src={image} className="object-cover rounded-full size-24" />
        ) : (
          <ImagePlus />
        )}
      </Button>

      <UploadServerDialog
        open={dialogOpen}
        file={selectedFile}
        onOpenChange={setDialogOpen}
        onUpload={handleUploadComplete}
        uploadType="image"
      />
    </>
  );
}
