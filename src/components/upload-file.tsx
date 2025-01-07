import { useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCw, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpload, UploadedBlob } from "@/lib/media";
import { useTranslation } from "react-i18next";

type ButtonProps = React.ComponentProps<typeof Button>;

interface UploadFileProps extends ButtonProps {
  onUpload: (blob: UploadedBlob) => void;
}

export function UploadFile({ onUpload, ...props }: UploadFileProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { upload, canSign } = useUpload();
  const ref = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  function handleClick() {
    ref.current?.click();
  }

  async function selectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  }

  async function uploadFile(file: File) {
    try {
      setIsUploading(true);
      const blob = await upload(file);
      onUpload(blob);
    } catch (err) {
      console.error(err);
      toast.error(t("file.upload.error"));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Button
      disabled={!canSign || isUploading}
      variant="action"
      size="icon"
      onClick={handleClick}
      {...props}
    >
      {isUploading ? (
        <RotateCw className="animate-spin size-9 text-muted-foreground" />
      ) : (
        <Paperclip className="size-10 text-muted-foreground" />
      )}
      <Input
        noIcons
        type="file"
        className="hidden"
        ref={ref}
        onChange={selectFile}
      />
    </Button>
  );
}
