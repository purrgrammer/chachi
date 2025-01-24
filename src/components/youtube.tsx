import ReactPlayer from "react-player/youtube";
import { cn } from "@/lib/utils";

export const youtubeUrlRegex =
  /(?:https?:\/\/)?(?:www|m\.)?(?:youtu\.be\/|youtube\.com\/(?:live\/|shorts\/|embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})((?:&list=)(?:(\w|-)+))?/;

export function YoutubeEmbed({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const m = url.match(youtubeUrlRegex);
  if (!m) return null;
  return (
    <div className="min-w-[250px] md:min-w-[430px]">
      <ReactPlayer
        url={url}
        controls
        className={cn("aspect-video rounded-md", className)}
        width="100%"
        height="100%"
      />
    </div>
  );
}
