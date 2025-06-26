import { useMemo } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// Lightweight text renderer for simple content without heavy dependencies
// Use this for testimonials, simple posts, and basic text rendering
// Avoids the 1,172-line rich-text component and its dependencies

interface SimpleTextProps {
  children: string;
  className?: string;
  maxLength?: number;
}

export function SimpleText({
  children,
  className,
  maxLength,
}: SimpleTextProps) {
  const processedText = useMemo(() => {
    let text = children.trim();

    // Truncate if needed
    if (maxLength && text.length > maxLength) {
      text = text.substring(0, maxLength) + "...";
    }

    // Split by URLs to make them clickable
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <Link
            to={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted"
          >
            {part}
          </Link>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }, [children, maxLength]);

  return (
    <div className={cn("whitespace-pre-wrap break-words", className)}>
      {processedText}
    </div>
  );
}
