import { AtSign, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pubkey({
  pubkey,
  isCashu,
  className,
}: {
  pubkey: string;
  isCashu?: boolean;
  className?: string;
}) {
  const pk = isCashu ? pubkey.replace(/^02/, "") : pubkey;
  return (
    <div className={cn("flex flex-row items-center gap-1.5", className)}>
      {isCashu ? (
        <Lock className="size-3 text-muted-foreground" />
      ) : (
        <AtSign className="size-3 text-muted-foreground" />
      )}
      <span className="text-xs font-mono">
        {pk.slice(0, 4)}…{pk.slice(-4)}
      </span>
    </div>
  );
}
