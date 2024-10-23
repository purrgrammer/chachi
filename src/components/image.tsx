import { cn } from "@/lib/utils";

export function Image({ url, className }: { url: string; className?: string }) {
  return <img src={url} className={cn("aspect-auto rounded-md", className)} />;
}
