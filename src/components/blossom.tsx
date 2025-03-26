import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFavicon } from "@/lib/hooks";

export function BlossomLink({
  url,
  classNames,
}: {
  url: string;
  classNames?: { wrapper?: string; icon?: string; name?: string };
}) {
  const favicon = useFavicon(url);
  return (
    <div className={cn("flex items-center gap-2", classNames?.wrapper)}>
      <Avatar className="h-4 w-4 rounded-sm">
        <AvatarImage
          src={favicon || undefined}
          alt={url}
          className="object-cover"
        />
        <AvatarFallback className="bg-muted text-xs"></AvatarFallback>
      </Avatar>
      <span className={cn("text-sm", classNames?.name)}>{url}</span>
    </div>
  );
}
