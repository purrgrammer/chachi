import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePubkey, useCanSign } from "@/lib/account";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dedupeBy } from "@/lib/utils";
import {
  useGroupParticipants,
  useJoinRequests,
  useAddUser,
  useDeleteEvent,
} from "@/lib/nostr/groups";
import { saveGroupEvent } from "@/lib/messages";
import type { Group } from "@/lib/types";

export function JoinRequests({ group }: { group: Group }) {
  const [accepted, setAccepted] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const { events } = useJoinRequests(group);
  const { admins, members } = useGroupParticipants(group);
  const requests = dedupeBy(events, "pubkey").filter(
    (p) =>
      !accepted.includes(p.pubkey) &&
      !rejected.includes(p.pubkey) &&
      !members.includes(p.pubkey),
  );
  const me = usePubkey();
  const canSign = useCanSign();
  const shouldShowJoinRequests = me && canSign && admins.includes(me);
  const addUser = useAddUser(group);
  const deleteEvent = useDeleteEvent(group);

  useEffect(() => {
    setAccepted([]);
    setRejected([]);
  }, [group]);

  async function acceptJoinRequest(pubkey: string) {
    try {
      const ev = await addUser(pubkey);
      setAccepted([...accepted, pubkey]);
      saveGroupEvent(ev, group);
      toast.success("User added to group");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't add user to group");
    }
  }

  async function rejectJoinRequest(pubkey: string) {
    try {
      const joinEvents = events.filter((e) => e.pubkey === pubkey);
      await Promise.all(joinEvents.map(deleteEvent));
      setRejected([...rejected, pubkey]);
      toast.success("User join request rejected");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't reject user from group");
    }
  }

  return shouldShowJoinRequests ? (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Join requests"
          className="relative"
        >
          <UserRoundPlus className="size-5" />
          <Badge variant="notification" className="absolute top-0 -right-1">
            {requests.length}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join requests ({requests.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[260px]">
          {requests.length === 0 ? (
            <span className="text-muted-foreground">
              No join requests... yet
            </span>
          ) : null}
          {requests.map((event) => (
            <div
              key={event.id}
              className="flex flex-row justify-between gap-2 mb-2 last:mb-0"
            >
              <div className="flex flex-row items-center gap-2">
                <Avatar pubkey={event.pubkey} className="size-9" />
                <h3 className="font-semibold text-md">
                  <Name pubkey={event.pubkey} />
                </h3>
              </div>
              <div className="flex flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-20"
                  onClick={() => acceptJoinRequest(event.pubkey)}
                >
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-20"
                  onClick={() => rejectJoinRequest(event.pubkey)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  ) : null;
}
