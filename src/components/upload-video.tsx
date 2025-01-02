import { useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCw, Video, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUploadBlob, UploadedBlob } from "@/lib/media";
import { useTranslation } from "react-i18next";

type ButtonProps = React.ComponentProps<typeof Button>;

interface UploadVideoProps extends ButtonProps {
  onUpload: (blob: UploadedBlob) => void;
}

export function UploadVideo({ onUpload, ...props }: UploadVideoProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { upload, canSign } = useUploadBlob();
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
    <div className="flex flex-row gap-2 justify-center items-center space-around">
      <Button
        disabled={!canSign || isUploading}
        variant="action"
        onClick={handleClick}
        size="huge"
        className="border"
        {...props}
      >
        {isUploading ? <RotateCw className="animate-spin" /> : <FileVideo />}
        <span>{t("video.upload")}</span>
        <Input
          noIcons
          accept="video/*"
          type="file"
          className="hidden"
          ref={ref}
          onChange={selectFile}
        />
      </Button>
      <Button disabled variant="action" size="huge" className="border">
        <Video />
        <span>{t("video.record")}</span>
      </Button>
    </div>
  );
}
