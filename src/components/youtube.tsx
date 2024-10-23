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
    <iframe
      className={cn("aspect-video rounded-md w-full my-1", className)}
      src={`https://www.youtube.com/embed/${m[1]}${m[3] ? `?list=${m[3].slice(6)}` : ""}`}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen={true}
    />
  );
}
