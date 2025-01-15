import { useState } from "react";
import { Images, type LucideIcon } from "lucide-react";
import AwesomeSlider from "react-awesome-slider";
import "react-awesome-slider/dist/styles.css";
import { getImetaValue } from "@/lib/media";
import { cn } from "@/lib/utils";

export default function Gallery({
  imetas,
  className,
  Icon = Images,
}: {
  imetas: string[][];
  className?: string;
  Icon?: LucideIcon;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const urls = imetas
    .map((imeta) => getImetaValue(imeta, "url"))
    .filter(Boolean);
  function onTransitionEnd(slider: { currentIndex: number }) {
    setActiveIndex(slider.currentIndex);
  }
  return (
    <div className={cn("relative", className)}>
      <AwesomeSlider
        onTransitionEnd={onTransitionEnd}
        className="gallery"
        bullets={false}
      >
        {urls.map((url) => (
          <div className="object-cover" key={url} data-src={url} />
        ))}
      </AwesomeSlider>
      <div className="absolute opacity-80 z-10 bg-accent rounded-full px-2 py-1 top-1 right-1 flex flex-row items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="font-mono text-sm text-accent-foreground">
          {activeIndex + 1}/{imetas.length}
        </span>
      </div>
    </div>
  );
}
