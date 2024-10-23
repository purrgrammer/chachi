import { useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCw, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpload } from "@/lib/media";

interface UploadImageProps {
  defaultImage?: string;
  onUpload: (url: string) => void;
}

export function UploadImage({ defaultImage, onUpload }: UploadImageProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [image, setImage] = useState<string | undefined>(defaultImage);
  const { upload, canSign } = useUpload();
  const ref = useRef<HTMLInputElement>(null);

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
      const url = await upload(file);
      setImage(url);
      onUpload(url);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't upload image");
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
    >
      {image ? (
        <img src={image} className="size-24 rounded-full object-cover" />
      ) : (
        <>
          {isUploading ? <RotateCw className="animate-spin" /> : <ImagePlus />}
        </>
      )}
      <Input
        type="file"
        className="hidden"
        ref={ref}
        onChange={selectImage}
        accept="image/*"
      />
    </Button>
  );
}
