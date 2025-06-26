import { lazy, Suspense, useMemo } from "react";
import { SimpleText } from "@/components/simple-text";
import type { Group } from "@/lib/types";
import type {
  RichTextOptions,
  RichTextClassnames,
} from "@/components/rich-text";

const RichText = lazy(() =>
  import("@/components/rich-text").then((module) => ({
    default: module.RichText,
  })),
);

interface LazyRichTextProps {
  children: string;
  group?: Group;
  tags?: string[][];
  options?: RichTextOptions;
  classNames?: RichTextClassnames;
  className?: string;
  fragments?: any[];
  maxLength?: number;
}

export function LazyRichText({
  children,
  maxLength = 500,
  ...props
}: LazyRichTextProps) {
  // For simple, short content, use SimpleText instead of the heavy RichText
  const isSimpleContent = useMemo(() => {
    const text = children.trim();

    // Use SimpleText for:
    // - Short content (under maxLength)
    // - Content without complex nostr references
    // - Content without custom emojis or complex formatting

    const hasComplexFeatures =
      text.includes("nostr:") ||
      text.includes("#[") ||
      text.includes("cashu") ||
      text.includes("```") ||
      text.includes("![") ||
      text.includes("[") ||
      (props.options?.emojis && text.includes(":")) ||
      (props.options?.mentions && text.includes("@"));

    return text.length <= maxLength && !hasComplexFeatures;
  }, [children, maxLength, props.options]);

  if (isSimpleContent) {
    return (
      <SimpleText className={props.className} maxLength={maxLength}>
        {children}
      </SimpleText>
    );
  }

  // For complex content, lazy load the full RichText component
  return (
    <Suspense
      fallback={
        <SimpleText className={props.className} maxLength={maxLength}>
          {children}
        </SimpleText>
      }
    >
      <RichText {...props}>{children}</RichText>
    </Suspense>
  );
}

// Export hook for advanced usage
export { useRichText } from "@/components/rich-text";
