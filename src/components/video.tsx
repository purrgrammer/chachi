import { cn } from "@/lib/utils";

export function Video({ url, className }: { url: string; className?: string }) {
  return (
    <video
      preload="metadata"
      controls
      src={url}
      className={cn(
        "w-full max-w-full bg-background aspect-video rounded-md",
        className,
      )}
    />
  );
}
