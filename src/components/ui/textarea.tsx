import * as React from "react";

import TextareaAutosize from "react-textarea-autosize";
import { cn } from "@/lib/utils";

type AutosizeTextareaProps = React.ComponentProps<typeof TextareaAutosize>;

export interface TextareaProps extends AutosizeTextareaProps {
  className?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <TextareaAutosize
        className={cn(
          "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 leading-none transition-height no-scrollbar",
          className,
        )}
        ref={(tag) => {
          if (ref) {
            // @ts-expect-error fix this
            ref.current = tag;
          }
        }}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
