import { lazy, Suspense } from "react";
import { Loading } from "@/components/loading";
import type { Emoji } from "@/components/emoji-picker";

const EmojiPicker = lazy(() => 
  import("@/components/emoji-picker").then(module => ({
    default: module.EmojiPicker
  }))
);

interface LazyEmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmojiSelect: (e: Emoji) => void;
}

export function LazyEmojiPicker(props: LazyEmojiPickerProps) {
  if (!props.open) {
    return null;
  }

  return (
    <Suspense fallback={<Loading />}>
      <EmojiPicker {...props} />
    </Suspense>
  );
}