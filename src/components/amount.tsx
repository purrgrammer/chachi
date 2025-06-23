import { Bitcoin, Euro, DollarSign } from "lucide-react";
import { formatShortNumber } from "@/lib/number";
import { cn } from "@/lib/utils";

const sizes = {
  sm: {
    icon: "size-4",
    text: "text-sm",
  },
  md: {
    icon: "size-5",
    text: "text-lg",
  },
  ["2xl"]: {
    icon: "size-8",
    text: "text-2xl",
  },
};

export default function Amount({
  amount,
  currency = "sat",
  size = "md",
}: {
  amount: number;
  currency?: "sat" | "USD" | "EUR";
  size?: "sm" | "md" | "2xl";
}) {
  const { icon, text } = sizes[size] || sizes.md;
  return (
    <div className="flex flex-row items-center gap-0">
      {currency === "sat" ? (
        <Bitcoin className={cn("text-muted-foreground", icon)} />
      ) : currency === "USD" ? (
        <DollarSign className={cn("text-muted-foreground", icon)} />
      ) : currency === "EUR" ? (
        <Euro className={cn("text-muted-foreground", icon)} />
      ) : null}
      <span className={cn("font-mono", text)}>{formatShortNumber(amount)}</span>
    </div>
  );
}
