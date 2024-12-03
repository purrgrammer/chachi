import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useInView } from "framer-motion";
import { ImagePlay, Search, RotateCw, X } from "lucide-react";
import { useCanSign } from "@/lib/account";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_KEY = import.meta.env.VITE_TENOR_API_KEY;

interface MediaFormats {
  tinywebp: { url: string };
  tinygif: { url: string };
  webp: { url: string };
  gif: { url: string };
}

interface GIF {
  id: string;
  tinyurl: string;
  url: string;
}

async function searchGIFs(
  search: string,
  page?: string,
): Promise<{ next: string; gifs: GIF[] }> {
  return fetch(
    search
      ? `https://tenor.googleapis.com/v2/search?q=${search}&key=${API_KEY}&limit=12${page ? `&pos=${page}` : ""}`
      : `https://tenor.googleapis.com/v2/?key=${API_KEY}&limit=12${page ? `&pos=${page}` : ""}`,
  )
    .then((res) => res.json())
    .then((data) => ({
      next: data.next,
      gifs: data.results.map(
        (gif: { id: string; media_formats: MediaFormats }) => ({
          id: gif.id,
          tinyurl:
            gif.media_formats?.["tinywebp"]?.url ||
            gif.media_formats?.["tinygif"]?.url,
          url:
            gif.media_formats?.["webp"]?.url || gif.media_formats?.["gif"]?.url,
        }),
      ),
    }));
}

function GIFLoader({ loadMore }: { loadMore: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isScrolled = useInView(ref);

  useEffect(() => {
    if (isScrolled) {
      loadMore();
    }
  }, [isScrolled]);

  return (
    <div
      ref={ref}
      className="h-64 absolute bottom-0 w-full flex place-content-center"
    />
  );
}

export function GIFPicker({ onPick }: { onPick: (gif: GIF) => void }) {
  const canPoast = useCanSign();
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [gifs, setGifs] = useState<GIF[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingPage = useRef(false);
  const [page, setPage] = useState("");

  function onSearchChange(newSearch: string) {
    setGifs([]);
    setSearch(newSearch);
    setPage("");
  }

  function pickGIF(gif: GIF) {
    onPick(gif);
    onOpenChange(false);
  }

  function clear() {
    setSearch("");
    setPage("");
    setGifs([]);
  }

  function onOpenChange(open: boolean) {
    setShowPicker(open);
    if (!open) {
      clear();
    }
  }

  async function searchTenor(merge = false) {
    setIsLoading(true);
    try {
      const result = await searchGIFs(search, page);
      if (merge) {
        setGifs([...gifs, ...result.gifs]);
      } else {
        setGifs(result.gifs);
      }
      setPage(result.next);
    } catch (err) {
      console.error(err);
      toast.error("Error searching GIFs");
    } finally {
      setIsLoading(false);
    }
  }

  async function searchNextPage() {
    if (isLoadingPage.current) return;

    isLoadingPage.current = true;
    try {
      await searchTenor(true);
    } catch (err) {
      console.error(err);
      toast.error("Error searching GIFs");
    } finally {
      isLoadingPage.current = false;
    }
  }

  return API_KEY ? (
    <Dialog open={showPicker} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          aria-label="Search GIF"
          disabled={!canPoast}
          variant="action"
          size="icon"
        >
          <ImagePlay className="size-6 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Search GIF</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-row justify-between gap-2 w-full">
            <Input
              autoFocus
              rightIcon={<X />}
              onRightIconClick={clear}
              value={search}
              onKeyDown={(e) => e.key === "Enter" && searchTenor(false)}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search Tenor"
              className="flex-1"
            />
            <Button
              disabled={!search.trim() || isLoading || isLoadingPage.current}
              onClick={() => searchTenor(false)}
            >
              {isLoading || isLoadingPage.current ? (
                <RotateCw className="animate-spin" />
              ) : (
                <Search />
              )}{" "}
              Search
            </Button>
          </div>
          <ScrollArea>
            <div
              className={`flex flex-col gap-2 transition-height ${gifs.length === 0 ? "h-0" : "h-64"}`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 relative">
                {gifs.map((gif) => (
                  <div
                    key={gif.id}
                    className="group relative h-60 sm:h-44 md:h-32 w-full place-items-center object-cover cursor-pointer"
                    onClick={() => pickGIF(gif)}
                  >
                    <img
                      className="w-full object-fit h-full rounded"
                      alt={search}
                      src={gif.tinyurl}
                      key={gif.id}
                    />
                  </div>
                ))}
                {page && gifs.length > 0 ? (
                  <GIFLoader key={page} loadMore={searchNextPage} />
                ) : null}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  ) : null;
}
