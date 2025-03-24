import { cn } from "@/lib/utils";

export function Audio({ url, className }: { url: string; className?: string }) {
  return <audio controls src={url} className={cn("w-full", className)} />;
}
