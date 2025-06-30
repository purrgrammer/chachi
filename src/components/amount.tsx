import { Bitcoin, Euro, DollarSign, Banknote } from "lucide-react";
import { formatShortNumber } from "@/lib/number";
import type { Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

const sizes = {
  // Standard size progression
  xs: {
    icon: "size-3",
    text: "text-xs",
  },
  sm: {
    icon: "size-4",
    text: "text-sm",
  },
  md: {
    icon: "size-5",
    text: "text-lg",
  },
  lg: {
    icon: "size-6",
    text: "text-lg",
  },
  xl: {
    icon: "size-8",
    text: "text-xl",
  },
  "2xl": {
    icon: "size-12",
    text: "text-2xl",
  },
  "3xl": {
    icon: "size-14",
    text: "text-3xl",
  },

  // Specialized variants
  menu: {
    icon: "w-4 h-4",
    text: "text-sm",
  },
  "lg-compact": {
    icon: "size-6",
    text: "text-2xl",
  },
  "wallet-display": {
    icon: "size-6",
    text: "text-3xl",
  },
  "wallet-balance": {
    icon: "size-12",
    text: "text-6xl",
  },
  "large-display": {
    icon: "size-7",
    text: "text-4xl",
  },
};

function CurrencyIcon({
  currency = "sat",
  className,
}: {
  currency?: Currency;
  className?: string;
}) {
  switch (currency.toLowerCase()) {
    case "sat":
      return <Bitcoin className={cn("text-muted-foreground", className)} />;
    case "usd":
      return <DollarSign className={cn("text-muted-foreground", className)} />;
    case "eur":
      return <Euro className={cn("text-muted-foreground", className)} />;
    default:
      return <Banknote className={cn("text-muted-foreground", className)} />;
  }
}

export default function Amount({
  amount,
  currency = "sat",
  size = "md",
  className,
  showIcon = true,
  mode = "short",
}: {
  amount: number;
  currency?: Currency;
  size?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "menu"
    | "lg-compact"
    | "wallet-display"
    | "wallet-balance"
    | "large-display";
  className?: string;
  showIcon?: boolean;
  mode?: "short" | "long";
}) {
  const { icon, text } = sizes[size] || sizes.md;

  const getCurrencyIcon = () => {
    if (!showIcon) return null;

    return <CurrencyIcon currency={currency} className={icon} />;
  };

  return (
    <div className={cn("flex flex-row items-center gap-0", className)}>
      {getCurrencyIcon()}
      <span className={cn("font-mono", text)}>
        {mode === "short" ? formatShortNumber(amount) : amount}
      </span>
    </div>
  );
}
