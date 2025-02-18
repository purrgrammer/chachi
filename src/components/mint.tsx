import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { RichText } from "@/components/rich-text";
import { User } from "@/components/nostr/user";
import { useTranslation } from "react-i18next";
import { useMintInfo } from "@/lib/cashu";
import { useHost } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import {
  AtSign,
  Twitter,
  Landmark,
  KeyRound,
  Key,
  Wallet,
  ArrowLeftRight,
  Coins,
  Droplets,
  Info,
  CheckCircle,
  Zap,
  FileSignature,
  Lock,
  UserRound,
  ShieldCheck,
  KeySquare,
  Timer,
  GitBranch,
  QrCode,
  Radio,
  Receipt,
  Database,
  PenTool,
  Shield,
  EyeOff,
  LucideIcon,
  Rocket,
} from "lucide-react";
import { NostrEvent } from "nostr-tools";
import { InputCopy } from "@/components/ui/input-copy";

export function MintIcon({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const { data: info } = useMintInfo(url);
  const host = useHost(url);
  const is0xChat = host.endsWith("0xchat.com");
  const icon =
    // @ts-expect-error the cashu-ts type lacks this field
    info?.icon_url
      ? // @ts-expect-error the cashu-ts type lacks this field
        info.icon_url
      : is0xChat
        ? `https://0xchat.com/favicon1.png`
        : null;
  return icon ? (
    <img
      src={icon}
      className={cn("size-6 object-cover rounded-full", className)}
    />
  ) : null;
}

export function MintName({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const host = useMemo(() => new URL(url).hostname, [url]);
  const { data: info } = useMintInfo(url);
  return <span className={className}>{info?.name || host || url}</span>;
}

const NUTS_INFO: Record<string, { name: string; icon: LucideIcon }> = {
  "00": { name: "Cryptography and Models", icon: KeyRound },
  "01": { name: "Mint public keys", icon: Key },
  "02": { name: "Keysets and fees", icon: Wallet },
  "03": { name: "Swapping tokens", icon: ArrowLeftRight },
  "04": { name: "Minting tokens", icon: Coins },
  "05": { name: "Melting tokens", icon: Droplets },
  "06": { name: "Mint info", icon: Info },
  "07": { name: "Token state check", icon: CheckCircle },
  "08": { name: "Overpaid Lightning fees", icon: Zap },
  "09": { name: "Signature restore", icon: FileSignature },
  "10": { name: "Spending conditions", icon: Lock },
  "11": { name: "Pay-To-Pubkey (P2PK)", icon: UserRound },
  "12": { name: "DLEQ proofs", icon: ShieldCheck },
  "13": { name: "Deterministic secrets", icon: KeySquare },
  "14": { name: "Hashed Timelock Contracts", icon: Timer },
  "15": { name: "Partial multi-path payments", icon: GitBranch },
  "16": { name: "Animated QR codes", icon: QrCode },
  "17": { name: "WebSocket subscriptions", icon: Radio },
  "18": { name: "Payment requests", icon: Receipt },
  "19": { name: "Cached Responses", icon: Database },
  "20": { name: "Signature on Mint Quote", icon: PenTool },
  "21": { name: "Clear authentication", icon: Shield },
  "22": { name: "Blind authentication", icon: EyeOff },
} as const;

function Nuts({ nuts }: { nuts: Record<string, any> }) {
  return (
    <div className="flex flex-row gap-1 flex-wrap">
      {Object.entries(nuts).map(([id, { supported }]) => {
        const NUT = NUTS_INFO[id];
        return supported && NUT ? (
          <Badge variant="outline">
            <div key={id} className="flex flex-row items-center gap-1">
              <NUT.icon className="size-3 text-muted-foreground" /> {NUT.name}
            </div>
          </Badge>
        ) : null;
      })}
    </div>
  );
}

export function MintPreview({ url }: { url: string }) {
  const { data: info } = useMintInfo(url);
  const email = info?.contact.find((c) => c.method === "email")?.info;
  const twitter = info?.contact.find((c) => c.method === "twitter")?.info;
  return (
    <div className="p-4 flex flex-col gap-3">
      <MintLink url={url} classNames={{ icon: "size-8", name: "text-4xl" }} />
      <InputCopy value={url} />
      {info?.description ? <p>{info.description}</p> : null}
      {info?.motd ? (
        <span className="bg-accent px-2 py-1 w-fit rounded-tl-lg rounded-tr-lg rounded-br-lg">
          {info.motd}
        </span>
      ) : null}
      {email ? (
        <div className="flex flex-row items-center gap-1.5">
          <AtSign className="text-muted-foreground size-4" />
          <Link
            to={`mailto:${email}`}
            className="font-mono text-sm hover:underline hover:decoration-dotted"
          >
            {email}
          </Link>
        </div>
      ) : null}
      {twitter ? (
        <div className="flex flex-row items-center gap-1.5">
          <Twitter className="text-muted-foreground size-4" />
          <Link
            to={`https://x.com/${twitter.replace(/^@/, "")}`}
            className="font-mono text-sm hover:underline hover:decoration-dotted"
          >
            {twitter}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function Mint({ url }: { url: string }) {
  const { data: info } = useMintInfo(url);
  const { t } = useTranslation();
  const email = info?.contact.find((c) => c.method === "email")?.info;
  const twitter = info?.contact.find((c) => c.method === "twitter")?.info;
  const nostr = info?.contact.find((c) => c.method === "nostr")?.info;
  const pubkey = info?.pubkey || nostr;
  return (
    <div className="p-4 flex flex-col gap-3">
      <MintLink url={url} classNames={{ icon: "size-8", name: "text-4xl" }} />
      <InputCopy value={url} />
      {info?.description ? <p>{info.description}</p> : null}
      {info?.description_long ? (
        <RichText tags={[]}>{info.description_long}</RichText>
      ) : null}
      {info?.motd ? (
        <span className="bg-accent px-2 py-1 w-fit rounded-tl-lg rounded-tr-lg rounded-br-lg">
          {info.motd}
        </span>
      ) : null}
      {email ? (
        <div className="flex flex-row items-center gap-1.5">
          <AtSign className="text-muted-foreground size-4" />
          <Link
            to={`mailto:${email}`}
            className="font-mono text-sm hover:underline hover:decoration-dotted"
          >
            {email}
          </Link>
        </div>
      ) : null}
      {twitter ? (
        <div className="flex flex-row items-center gap-1.5">
          <Twitter className="text-muted-foreground size-4" />
          <Link
            to={`https://x.com/${twitter.replace(/^@/, "")}`}
            className="font-mono text-sm hover:underline hover:decoration-dotted"
          >
            {twitter}
          </Link>
        </div>
      ) : null}

      {pubkey ? (
        <div className="flex flex-col gap-1">
          <h2 className="text-sm uppercase font-light text-muted-foreground">
            {t("mint.contact")}
          </h2>
          <User pubkey={pubkey} classNames={{ avatar: "size-5" }} />
        </div>
      ) : null}

      {info?.version ? (
        <div className="flex flex-col gap-1">
          <h2 className="text-sm uppercase font-light text-muted-foreground">
            {t("mint.version")}
          </h2>
          <div className="flex flex-row items-center gap-1.5">
            <Rocket className="size-4 text-muted-foreground" />
            <span className="font-mono text-sm">{info.version}</span>
          </div>
        </div>
      ) : null}
      {info?.nuts ? (
        <div className="flex flex-col gap-1">
          <h2 className="text-sm uppercase font-light text-muted-foreground">
            {t("mint.features")}
          </h2>
          <Nuts nuts={info.nuts} />
        </div>
      ) : null}
    </div>
  );
}

export function MintLink({
  url,
  className,
  classNames,
  includeLandmark,
}: {
  url: string;
  className?: string;
  classNames?: Record<string, string>;
  includeLandmark?: boolean;
}) {
  return (
    <Link
      to={`/mint/${encodeURIComponent(url)}`}
      className={cn(
        "text-sm text-muted-foreground hover:underline hover:decoration-dotted",
        className,
      )}
    >
      <div className="flex flex-row items-center gap-1.5">
        {includeLandmark ? (
          <Landmark
            className={cn("size-3 text-muted-foreground", classNames?.icon)}
          />
        ) : null}
        <div className="flex flex-row items-center gap-1">
          <MintIcon url={url} className={cn("size-3", classNames?.icon)} />
          <MintName
            url={url}
            className={cn("text-foreground", classNames?.name)}
          />
        </div>
      </div>
    </Link>
  );
}

export function MintEventPreview({
  event,
}: {
  event: NostrEvent;
  relays: string[];
}) {
  const url = event.tags.find((t) => t[0] === "u")?.[1];
  if (!url) return null;
  return <MintPreview url={url} />;
}

export function MintEventDetail({
  event,
}: {
  event: NostrEvent;
  relays: string[];
}) {
  const url = event.tags.find((t) => t[0] === "u")?.[1];
  if (!url) return null;
  return <Mint url={url} />;
}
