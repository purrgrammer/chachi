import { useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NostrEvent } from "nostr-tools";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Asciidoc from "@/components/asciidoc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTag } from "@/lib/nostr";

const chapterVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 40 : -40,
  }),
  animate: { opacity: 1, x: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -40 : 40,
  }),
};

export function BookContents({
  tag,
  direction,
}: {
  tag: string[];
  direction: number;
}) {
  const { data: event } = useTag(tag);
  const shouldReduceMotion = useReducedMotion();
  return event ? (
    <motion.div
      custom={direction}
      variants={chapterVariants}
      initial={shouldReduceMotion ? false : "initial"}
      animate="animate"
      exit={shouldReduceMotion ? undefined : "exit"}
      transition={{ duration: 0.25, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <Asciidoc content={event.content} />
    </motion.div>
  ) : null;
}

function ChapterName({ tag }: { tag: string[] }) {
  const { data: event } = useTag(tag);
  return event ? (
    <h3>{event.tags.find((t) => t[0] === "title")?.[1]}</h3>
  ) : null;
}

// todo: clickable toc
export default function BookContent({
  event,
  //relays,
  className,
}: {
  event: NostrEvent;
  relays: string[];
  className?: string;
}) {
  const { t } = useTranslation();
  const tags = event.tags.filter((t) => t[0] === "a" || t[0] === "e");
  const [chapter, setChapter] = useState(0);
  const directionRef = useRef(0);
  const chapterTag = tags.at(chapter);

  const goNext = () => {
    directionRef.current = 1;
    setChapter(chapter + 1);
  };

  const goPrev = () => {
    directionRef.current = -1;
    setChapter(chapter - 1);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {chapterTag ? (
        <>
          <div className="flex flex-row items-center justify-around">
            <Button
              variant="outline"
              size="icon"
              onClick={goPrev}
              disabled={chapter === 0}
            >
              <ChevronLeft />
            </Button>
            <div className="font-serif text-lg mx-2 w-full line-clamp-1 text-center">
              <ChapterName tag={chapterTag} />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={goNext}
              disabled={chapter === tags.length - 1}
            >
              <ChevronRight />
            </Button>
          </div>
          <AnimatePresence mode="wait" initial={false} custom={directionRef.current}>
            <BookContents
              key={chapterTag[1]}
              tag={chapterTag}
              direction={directionRef.current}
            />
          </AnimatePresence>
          <div className="flex flex-row items-center justify-around">
            <Button
              variant="outline"
              size="icon"
              onClick={goPrev}
              disabled={chapter === 0}
            >
              <ChevronLeft />
            </Button>
            <div className="mx-2 w-full flex-1 text-center">
              <span className="text-sm font-mono text-muted-foreground">
                {t("book.current-chapter", {
                  chapter: chapter + 1,
                  total: tags.length,
                })}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={goNext}
              disabled={chapter === tags.length - 1}
            >
              <ChevronRight />
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
