import { useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCw, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadedBlob, useUpload } from "@/lib/media";
import { useTranslation } from "react-i18next";

interface UploadImageProps {
  defaultImage?: string;
  onUpload: (url: UploadedBlob) => void;
}

export function UploadImage({ defaultImage, onUpload }: UploadImageProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [image, setImage] = useState<string | undefined>(defaultImage);
  const { upload, canSign } = useUpload();
  const ref = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  function handleClick() {
    ref.current?.click();
  }

  async function selectImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage(file);
  }

  async function uploadImage(file: File) {
    try {
      setIsUploading(true);
      const blob = await upload(file);
      setImage(blob.url);
      onUpload(blob);
    } catch (err) {
      console.error(err);
      toast.error(t("image.upload.error"));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Button
      disabled={!canSign || isUploading}
      className={`bg-accent hover:bg-accent hover:text-foreground size-24 rounded-full text-muted-foreground [&_svg]:size-10 ${image ? "p-0" : ""} gap-0`}
      onClick={handleClick}
      type="button"
      aria-label={t("aria.upload-image")}
    >
      {image ? (
        <img src={image} className="object-cover rounded-full size-24" />
      ) : (
        <>
          {isUploading ? <RotateCw className="animate-spin" /> : <ImagePlus />}
        </>
      )}
      <Input
        noIcons
        accept="image/*"
        type="file"
        className="hidden"
        ref={ref}
        onChange={selectImage}
      />
    </Button>
  );
}
