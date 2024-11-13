import { RotateCw, Network } from "lucide-react";
import { cn } from "@/lib/utils";

export function Loading({ className }: { className?: string }) {
  return (
    <div className={cn("w-full h-full place-content-center", className)}>
      <div className="flex flex-col gap-4 items-center">
        <Network className="h-10 w-10 text-muted-foreground animate-pulse" />
        <div className="flex flex-row gap-2 items-center">
          <RotateCw className="size-4 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading events</p>
        </div>
      </div>
    </div>
  );
}
