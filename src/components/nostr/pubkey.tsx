import { LucideIcon, AtSign, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pubkey({
  pubkey,
  isCashu,
  className,
  iconClassname,
  textClassname,
  chunkSize = 8,
  Icon = AtSign,
}: {
  pubkey: string;
  isCashu?: boolean;
  className?: string;
  iconClassname?: string;
  textClassname?: string;
  chunkSize?: number;
  Icon?: LucideIcon;
}) {
  const pk = isCashu ? pubkey.replace(/^02/, "") : pubkey;
  const show = `${pk.slice(0, chunkSize)}…${pk.slice(-chunkSize)}`;
  return (
    <div className={cn("flex flex-row items-center gap-1.5", className)}>
      {isCashu ? (
        <Lock className={cn("size-3 text-muted-foreground", iconClassname)} />
      ) : (
        <Icon className={cn("size-3 text-muted-foreground", iconClassname)} />
      )}
      <span className={cn("text-xs font-mono", textClassname)}>{show}</span>
    </div>
  );
}
