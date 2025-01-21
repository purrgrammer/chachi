import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { NostrEvent } from "nostr-tools";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Asciidoc from "@/components/asciidoc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTag } from "@/lib/nostr";

export function BookContents({ tag }: { tag: string[] }) {
  const { data: event } = useTag(tag);
  return event ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
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
  const chapterTag = tags.at(chapter);
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {chapterTag ? (
        <>
          <div className="flex flex-row items-center justify-around">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setChapter(chapter - 1)}
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
              onClick={() => setChapter(chapter + 1)}
              disabled={chapter === tags.length - 1}
            >
              <ChevronRight />
            </Button>
          </div>
          <AnimatePresence initial={false}>
            <BookContents key={chapterTag[1]} tag={chapterTag} />
          </AnimatePresence>
          <div className="flex flex-row items-center justify-around">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setChapter(chapter - 1)}
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
              onClick={() => setChapter(chapter + 1)}
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
