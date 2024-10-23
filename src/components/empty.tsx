import React from "react";
import { CircleSlash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Empty({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("w-full h-full place-content-center", className)}>
      <div className="flex flex-col gap-4 items-center">
        <CircleSlash2 className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Nothing to see here... yet</p>
        {children}
      </div>
    </div>
  );
}
