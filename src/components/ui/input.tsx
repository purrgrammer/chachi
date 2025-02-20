import * as React from "react";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightIconClassName?: string;
  noIcons?: boolean;
  onRightIconClick?: () => void;
  className?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      leftIcon,
      rightIcon,
      rightIconClassName,
      onRightIconClick,
      noIcons,
      type,
      ...props
    },
    ref,
  ) => {
    return noIcons ? (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    ) : (
      <div className={cn("flex flex-row gap-2 w-full", className)}>
        {leftIcon ? (
          <div className="flex items-center justify-center text-muted-foreground">
            {leftIcon}
          </div>
        ) : null}
        <input
          type={type}
          className={cn(
            "flex flex-1 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && onRightIconClick ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn("text-muted-foreground", rightIconClassName)}
            onClick={onRightIconClick}
          >
            {rightIcon}
          </Button>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
