import * as React from "react";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

// todo: remove leftIcon/rightIcon
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, leftIcon, rightIcon, onRightIconClick, type, ...props },
    ref,
  ) => {
    return (
      <div className="flex flex-row relative hidden">
        {leftIcon ? (
          <div className="text-muted-foreground absolute left-2 top-3">
            {leftIcon}
          </div>
        ) : null}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            leftIcon ? "pl-8" : "",
            rightIcon ? "pr-10" : "",
            className,
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && onRightIconClick ? (
          <Button
            variant="ghost"
            className="size-6 text-muted-foreground absolute right-2 top-2"
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
