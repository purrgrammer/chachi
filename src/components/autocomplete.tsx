import { CircleSlash2 } from "lucide-react";
import type { ReactNode, KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Autocomplete<T>({
  topOffset,
  width,
  items,
  getKey,
  renderItem,
  onSelect,
}: {
  topOffset: number;
  width: number;
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const hasNoResults = items.length === 0;
  const height = Math.min(hasNoResults ? 32 : items.length * 32, 140);
  const top = height > 0 ? height - 12 : 0;
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>, item: T) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSelect(item);
    }
  }
  return (
    <motion.div
      className={`z-50 bg-background rounded-t-md ring-1 ring-ring left-2 right-[4rem] sm:right-2 absolute`}
      style={{
        height: `${height}px`,
        width: width + 2,
        top: `-${top + topOffset}px`,
        transformOrigin: "bottom",
      }}
      initial={shouldReduceMotion ? false : { opacity: 0, scaleY: 0.8 }}
      animate={{ opacity: 1, scaleY: 1 }}
      exit={{ opacity: 0, scaleY: 0.8 }}
      transition={{ duration: 0.15, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <ScrollArea className="h-full">
        {hasNoResults ? (
          <motion.div
            key="no-results"
            className="flex items-center gap-2 p-2 h-[32px] justify-center text-muted-foreground text-sm"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
          >
            <CircleSlash2 className="size-3" />
            <span>Nothing found</span>
          </motion.div>
        ) : null}
        {items.map((item: T) => (
          <motion.div
            key={getKey(item)}
            tabIndex={0}
            className="flex items-center p-2 h-[32px] cursor-pointer hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground focus:outline-none transition-colors"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
            onClick={() => onSelect(item)}
            onKeyDown={(e) => onKeyDown(e, item)}
          >
            {renderItem(item)}
          </motion.div>
        ))}
      </ScrollArea>
    </motion.div>
  );
}

export function NewAutocomplete<T>({
  topOffset,
  width,
  getItems,
  getKey,
  renderItem,
  onSelect,
}: {
  topOffset: number;
  width: number;
  getItems: () => T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const items = getItems();
  const hasNoResults = items.length === 0;
  const height = Math.min(hasNoResults ? 32 : items.length * 32, 140);
  const top = height > 0 ? height - 12 : 0;
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>, item: T) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSelect(item);
    }
  }
  return (
    <motion.div
      className={`z-50 bg-background rounded-t-md ring-1 ring-ring left-2 right-[4rem] sm:right-2 absolute`}
      style={{
        height: `${height}px`,
        width: width + 2,
        top: `-${top + topOffset}px`,
        transformOrigin: "bottom",
      }}
      initial={shouldReduceMotion ? false : { opacity: 0, scaleY: 0.8 }}
      animate={{ opacity: 1, scaleY: 1 }}
      exit={{ opacity: 0, scaleY: 0.8 }}
      transition={{ duration: 0.15, ease: [0.215, 0.61, 0.355, 1] }}
    >
      <ScrollArea className="h-full">
        {hasNoResults ? (
          <motion.div
            key="no-results"
            className="flex items-center gap-2 p-2 h-[32px] justify-center text-muted-foreground text-sm"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
          >
            <CircleSlash2 className="size-3" />
            <span>Nothing found</span>
          </motion.div>
        ) : null}
        {items.map((item: T) => (
          <motion.div
            key={getKey(item)}
            tabIndex={0}
            className="flex items-center p-2 h-[32px] cursor-pointer hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground focus:outline-none transition-colors"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
            onClick={() => onSelect(item)}
            onKeyDown={(e) => onKeyDown(e, item)}
          >
            {renderItem(item)}
          </motion.div>
        ))}
      </ScrollArea>
    </motion.div>
  );
}
