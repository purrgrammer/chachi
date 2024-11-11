import { toast } from "sonner";
import { useState } from "react";
import { Vote } from "lucide-react";
import type { NostrEvent } from "nostr-tools";
import { RichText } from "@/components/rich-text";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/nostr/avatar";
import { Name } from "@/components/nostr/name";
import { Button } from "@/components/ui/button";
import { useVote, useVotes } from "@/lib/nostr/polls";
import { usePubkey } from "@/lib/account";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDay } from "@/lib/time";
import type { Group } from "@/lib/types";

function FormatDay({ endsAt }: { endsAt: number }) {
  const date = new Date(endsAt * 1000);
  return <>{formatDay(date)}</>;
}

function Option({
  id,
  iVoted,
  isMultipleChoice,
  group,
  event,
  text,
  votes,
  isExpired,
  showResult,
  onSelected,
  onDeselected,
}: {
  id: string;
  iVoted: boolean;
  isMultipleChoice: boolean;
  group: Group;
  event: NostrEvent;
  text: string;
  votes: NostrEvent[];
  isExpired: boolean;
  showResult: boolean;
  onSelected: (id: string) => void;
  onDeselected: (id: string) => void;
}) {
  const me = usePubkey();
  const optionVotes = votes.filter((v) =>
    v.tags.find((t) => t[0] === "response" && t[1] === id),
  );
  const voteCount = optionVotes.length;
  const percentage = (voteCount / votes.length) * 100;
  const shouldShowBorder = optionVotes.find((v) => v.pubkey === me);
  const shouldShowCheckbox = !isExpired && !iVoted && isMultipleChoice;
  const shouldShowRadioItem = !isExpired && !iVoted && !isMultipleChoice;

  function onCheckedChange(checked: boolean) {
    console.log("CHECKEDCHANGE", checked);
    if (checked) {
      console.log("SELECT", id);
      onSelected?.(id);
    } else {
      console.log("DESELECT", id);
      onDeselected?.(id);
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 p-2 border rounded-md ${shouldShowBorder ? "ring-1 ring-primary" : ""}`}
    >
      <div className={`flex flex-row items-center gap-3 w-full p-2`}>
        {shouldShowCheckbox ? (
          <Checkbox id={id} onCheckedChange={onCheckedChange} />
        ) : null}
        {shouldShowRadioItem ? (
          <RadioGroupItem id={id} value={id} defaultChecked={false} />
        ) : null}
        <div className="flex flex-col items-start gap-3 w-full">
          <RichText tags={event.tags} group={group} options={{ inline: true }}>
            {text}
          </RichText>
        </div>
      </div>
      {showResult && percentage ? (
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
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const options = event.tags
    .filter((t) => t[0] === "option")
    .map((t) => ({ id: t[1], text: t[2] }));
  const endsAt = event.tags.find((t) => t[0] === "endsAt")?.[1];
  const isExpired = endsAt ? Date.now() / 1000 > Number(endsAt) : false;
  const me = usePubkey();
  const isMultipleChoice =
    event.tags.find((t) => t[0] === "polltype")?.[1] === "multiplechoice";
  const votes = useVotes(event);
  const iVoted = votes.find((v) => v.pubkey === me);
  const showResult = isExpired || Boolean(iVoted);
  const castVote = useVote(event, selectedOptions);

  async function onClick() {
    try {
      const ev = await castVote();
      console.log("VOTED!", ev);
      toast.success("Vote cast");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't cast vote");
    }
  }

  const choices = (
    <>
      {options.map((option) => (
        <Option
          isMultipleChoice={isMultipleChoice}
          onSelected={(id) => {
            if (isMultipleChoice) {
              setSelectedOptions([...selectedOptions, id]);
            } else {
              setSelectedOptions([id]);
            }
          }}
          onDeselected={(id) => {
            setSelectedOptions(selectedOptions.filter((o) => o !== id));
          }}
          iVoted={Boolean(iVoted)}
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
    </>
  );

  return (
    <div className={cn("space-y-3", className)}>
      <RichText tags={event.tags} group={group} className={className}>
        {event.content}
      </RichText>
      <div className="flex flex-col gap-3">
        {isMultipleChoice ? (
          choices
        ) : (
          <RadioGroup onValueChange={(o) => setSelectedOptions([o])}>
            {choices}
          </RadioGroup>
        )}
      </div>
      <div className="flex flex-row items-center gap-6 justify-between">
        <div>
          {isExpired ? (
            <span className="text-xs text-muted-foreground mt-1">
              Poll closed
            </span>
          ) : endsAt ? (
            <span className="text-xs text-muted-foreground mt-1">
              Ends <FormatDay endsAt={Number(endsAt)} />
            </span>
          ) : null}
        </div>
        {iVoted || isExpired ? null : (
          <Button
            size="sm"
            disabled={isExpired || iVoted || selectedOptions.length === 0}
            onClick={onClick}
          >
            <Vote /> Vote
          </Button>
        )}
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
