import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        amount:
          "rounded-full border border-accent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        link: "text-primary underline-offset-4 hover:underline",
        reaction:
          "bg-background/90 dark:bg-background/30 text-muted-foreground hover:bg-background/90 disabled:opacity-100 rounded-xl",
        action:
          "rounded-md hover:bg-accent hover:text-accent-foreground [&_svg]:size-5",
      },
      size: {
        default: "h-10 px-4 py-2",
        tiny: "h-6 px-2 py-1 text-xs [&_svg]:size-3",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        bigIcon: "h-10 w-10 [&_svg]:size-6",
        wideIcon: "h-10 w-16 [&_svg]:size-5",
        smallIcon: "h-6 w-6",
        tinyIcon: "h-5 w-5 [&_svg]:size-3",
        play: "w-12 h-12 [&_svg]:size-8",
        fit: "w-fit p-1",
        big: "h-16 w-16 [&_svg]:size-6",
        huge: "h-32 w-32 [&_svg]:size-9",
        wide: "w-32 h-18",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
