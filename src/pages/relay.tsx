import { Navigate, useParams } from "react-router-dom";
import { Server, Info } from "lucide-react";
import { Header } from "@/components/header";
import { useRelayInfo } from "@/lib/relay";
import { RelayIcon, RelayName } from "@/components/nostr/relay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function RelayInfo({ relay }: { relay: string }) {
  const { data: info } = useRelayInfo(relay);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{info?.name}</DialogTitle>
          <DialogDescription>{info?.description}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default function Relay() {
  const { relay } = useParams();
  if (!relay) {
    return <Navigate to="/" />;
  }
  return (
    <div className="flex flex-col">
      <Header>
        <div className="flex flex-row justify-between items-center w-full">
          <div className="flex flex-row gap-2 items-center">
            <RelayIcon relay={relay!} className="size-8" />
            <div className="flex flex-col gap-0">
              <h1 className="text-lg font-normal leading-none">
                <RelayName relay={relay!} />
              </h1>
            </div>
          </div>
          <div className="flex flex-row gap-2 items-center">
            <Server className="size-4 text-muted-foreground" />
            <Separator orientation="vertical" className="ml-3 h-4" />
            <RelayInfo relay={relay!} />
          </div>
        </div>
      </Header>
      <div className="flex flex-row gap-2 items-center p-2"></div>
    </div>
  );
}
