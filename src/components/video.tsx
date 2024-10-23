import { cn } from "@/lib/utils";

export function Video({ url, className }: { url: string; className?: string }) {
  return (
    <video
      controls
      src={url}
      className={cn("bg-background aspect-video rounded-md", className)}
    />
  );
}
