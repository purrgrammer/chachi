import { toast } from "sonner";
import { useState } from "react";
import { Vote } from "lucide-react";
import type { NostrEvent } from "nostr-tools";
import { RichText } from "@/components/rich-text";
import { Progress } from "@/components/ui/progress";
import { User } from "@/components/nostr/user";
import { Button } from "@/components/ui/button";
import { useVote, useVotes } from "@/lib/nostr/polls";
import { usePubkey } from "@/lib/account";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDay } from "@/lib/time";
import type { Group } from "@/lib/types";
import { useTranslation } from "react-i18next";

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
  group?: Group;
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
  // todo: ignore duplicate responses
  const totalVotes = votes.reduce(
    (acc, v) => acc + v.tags.filter((t) => t[0] === "response").length,
    0,
  );
  const voteCount = optionVotes.length;
  const percentage = (voteCount / totalVotes) * 100;
  const shouldShowBorder = optionVotes.find((v) => v.pubkey === me);
  const shouldShowCheckbox = !isExpired && !iVoted && isMultipleChoice;
  const shouldShowRadioItem = !isExpired && !iVoted && !isMultipleChoice;

  function onCheckedChange(checked: boolean) {
    if (checked) {
      onSelected?.(id);
    } else {
      onDeselected?.(id);
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 p-1 border rounded-md min-w-64 ${shouldShowBorder ? "ring-1 ring-primary" : ""}`}
    >
      <div className={`flex flex-row items-center gap-3 w-full p-1`}>
        {shouldShowCheckbox ? (
          <Checkbox id={id} onCheckedChange={onCheckedChange} />
        ) : null}
        {shouldShowRadioItem ? (
          <RadioGroupItem id={id} value={id} defaultChecked={false} />
        ) : null}
        <div className="flex flex-col gap-3 items-start w-full">
          <RichText tags={event.tags} group={group} options={{ inline: true }}>
            {text}
          </RichText>
        </div>
      </div>
      {showResult ? (
        <div className="flex flex-row gap-3 p-1 w-full">
          <Progress value={percentage} />
          <span className="font-mono text-xs text-muted-foreground">
            {percentage.toFixed()}%
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
  group?: Group;
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
  const { t } = useTranslation();

  async function onClick() {
    try {
      await castVote();
      toast.success(t("vote.success"));
    } catch (err) {
      console.error(err);
      toast.error(t("vote.error"));
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
      <div className="flex flex-row gap-6 justify-between items-center">
        <div>
          {isExpired ? (
            <span className="mt-1 text-xs text-muted-foreground">
              {t("poll.closed")}
            </span>
          ) : endsAt ? (
            <span className="mt-1 text-xs text-muted-foreground">
              {t("poll.ends")}
              <FormatDay endsAt={Number(endsAt)} />
            </span>
          ) : null}
        </div>
        {iVoted || isExpired ? null : (
          <Button
            size="sm"
            disabled={isExpired || iVoted || selectedOptions.length === 0}
            onClick={onClick}
          >
            <Vote /> {t("vote.action")}
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
  group?: Group;
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
          <User
            key={vote.pubkey}
            pubkey={vote.pubkey}
            classNames={{
              avatar: "size-5",
              name: "font-normal text-sm text-muted-foreground",
            }}
          />
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
  group?: Group;
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
