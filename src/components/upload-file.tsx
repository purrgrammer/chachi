import { useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCw, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpload } from "@/lib/media";

type ButtonProps = React.ComponentProps<typeof Button>;

interface UploadFileProps extends ButtonProps {
  onUpload: (url: string) => void;
}

export function UploadFile({ onUpload, ...props }: UploadFileProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { upload, canSign } = useUpload();
  const ref = useRef<HTMLInputElement>(null);

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
      const url = await upload(file);
      onUpload(url);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't upload file");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Button
      disabled={!canSign || isUploading}
      variant="ghost"
      size="icon"
      onClick={handleClick}
      {...props}
    >
      {isUploading ? (
        <RotateCw className="size-9 animate-spin text-muted-foreground" />
      ) : (
        <Paperclip className="size-10 text-muted-foreground" />
      )}
      <Input type="file" className="hidden" ref={ref} onChange={selectFile} />
    </Button>
  );
}
