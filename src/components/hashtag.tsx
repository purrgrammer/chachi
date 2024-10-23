import { cn } from "@/lib/utils";

export function Hashtag({
  tag,
  className,
}: {
  tag: string;
  className?: string;
}) {
  return (
    <span className={cn("font-semibold cursor-pointer", className)}>
      #{tag}
    </span>
  );
}
