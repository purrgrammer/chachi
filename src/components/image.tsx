import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function Image({ url, className }: { url: string; className?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <img
          src={url}
          className={cn("aspect-auto rounded-md cursor-zoom-in", className)}
        />
      </DialogTrigger>
      <DialogContent className="bg-transparent border-none outline-none flex items-center justify-center h-[calc(100vh-2rem)]">
        <img src={url} className="aspect-auto max-h-[calc(100vh-4rem)]" />
      </DialogContent>
    </Dialog>
  );
}
