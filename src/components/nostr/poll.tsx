import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import type { NostrEvent } from "nostr-tools";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { useVote, useVotes } from "@/lib/nostr/polls";
import { usePubkey } from "@/lib/account";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types";

function Countdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return <>{endsAt - now}</>;
}

function Option({
  id,
  group,
  event,
  text,
  votes,
  isExpired,
  showResult,
}: {
  id: string;
  group: Group;
  event: NostrEvent;
  text: string;
  votes: NostrEvent[];
  isExpired: boolean;
  showResult: boolean;
}) {
  // todo: multiple choices
  const optionVotes = votes.filter((v) =>
    v.tags.find((t) => t[0] === "response" && t[1] === id),
  );
  const voteCount = optionVotes.length;
  const percentage = (voteCount / votes.length) * 100;
  const castVote = useVote(event, [id]);
  const me = usePubkey();
  const iVoted = optionVotes.find((v) => v.pubkey === me);

  async function onClick() {
    try {
      await castVote();
      toast.success("Vote cast");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't cast vote");
    }
  }

  return (
    <div className="flex flex-col items-start gap-3 w-full">
      <Button
        disabled={isExpired}
        variant="outline"
        className={`min-h-10 w-full h-fit relative ${iVoted ? "ring-1 ring-primary" : ""}`}
        onClick={onClick}
      >
        <div className="flex flex-col items-start gap-3 w-full">
          <RichText tags={event.tags} group={group} options={{ inline: true }}>
            {text}
          </RichText>
        </div>
      </Button>
      {showResult ? (
        <div className="flex flex-row gap-3 w-full px-3">
          <Progress value={percentage} />
          <span className="font-mono text-xs text-muted-foreground">
            {percentage.toFixed(2)}%
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function Poll({
  event,
  group,
  className,
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
}) {
  const options = event.tags
    .filter((t) => t[0] === "option")
    .map((t) => ({ id: t[1], text: t[2] }));
  const endsAt = event.tags.find((t) => t[0] === "endsAt")?.[1];
  const isExpired = endsAt ? Date.now() > Number(endsAt) : false;
  const me = usePubkey();
  const votes = useVotes(event);
  const iVoted = votes.find((v) => v.pubkey === me);
  const showResult = isExpired || Boolean(iVoted);
  return (
    <div className={cn("space-y-2", className)}>
      <RichText tags={event.tags} group={group} className={className}>
        {event.content}
      </RichText>
      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <Option
            key={option.id}
            event={event}
            group={group}
            id={option.id}
            text={option.text}
            votes={votes}
            isExpired={isExpired}
            showResult={showResult}
          />
        ))}
      </div>
      <div>
        {isExpired ? (
          <span className="text-xs text-muted-foreground mt-1">
            Poll closed
          </span>
        ) : endsAt ? (
          <span className="text-xs text-muted-foreground mt-1">
            Ends in <Countdown endsAt={Number(endsAt)} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ResultOption({
  id,
  group,
  event,
  text,
  votes,
}: {
  id: string;
  group: Group;
  event: NostrEvent;
  text: string;
  votes: NostrEvent[];
}) {
  const optionVotes = votes.filter((v) =>
    v.tags.find((t) => t[0] === "response" && t[1] === id),
  );

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-md">
        <RichText tags={event.tags} group={group} options={{ inline: true }}>
          {text}
        </RichText>
      </h3>
      <div className="flex flex-col gap-2">
        {optionVotes.map((vote) => (
          <div className="flex flex-row items-center gap-2">
            <Avatar pubkey={vote.pubkey} className="size-6" />
            <span className="text-sm text-muted-foreground">
              <Name pubkey={vote.pubkey} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PollResults({
  event,
  group,
  className,
}: {
  event: NostrEvent;
  group: Group;
  className?: string;
}) {
  const votes = useVotes(event);
  const options = event.tags
    .filter((t) => t[0] === "option")
    .map((t) => ({ id: t[1], text: t[2] }));
  return (
    <div className={cn("space-y-5", className)}>
      {options.map((option) => (
        <ResultOption
          key={option.id}
          event={event}
          group={group}
          id={option.id}
          text={option.text}
          votes={votes}
        />
      ))}
    </div>
  );
}
