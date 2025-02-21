import React, { useState, useMemo } from "react";
import { Token, getDecodedToken, getEncodedToken } from "@cashu/cashu-ts";
import { NostrEvent } from "nostr-tools";
import { AutocompleteTextarea } from "@/components/autocomplete-textarea";
import { nip19 } from "nostr-tools";
import { QRScanner } from "@/components/qr-scanner";
import {
  Wallet as WalletIcon,
  Coins,
  HandCoins,
  PlugZap,
  Save,
  Puzzle,
  Cable,
  RotateCw,
  Network,
  ServerCrash,
  Plus,
  PackagePlus,
  Landmark,
  Server,
  Bitcoin,
  Euro,
  DollarSign,
  Banknote,
  ArrowDownRight,
  ArrowUpRight,
  CircleSlash2,
  List,
  Settings,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { NDKEvent, NDKKind, NDKRelaySet } from "@nostr-dev-kit/ndk";
import {
  NDKWallet,
  NDKWalletChange,
  NDKCashuWallet,
  NDKWebLNWallet,
  NDKNWCWallet,
} from "@nostr-dev-kit/ndk-wallet";
import { RichText } from "@/components/rich-text";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Event, A } from "@/components/nostr/event";
import { Label } from "@/components/ui/label";
import { Invoice } from "@/components/ln";
import { useNDK, useNWCNDK } from "@/lib/ndk";
import { useRelays, useEvent } from "@/lib/nostr";
import { formatShortNumber, decomposeIntoPowers } from "@/lib/number";
import { useHost } from "@/lib/hooks";
import {
  defaultMints,
  useNDKWallet,
  useNDKWallets,
  useCashuWallet,
  useDeposit,
  DepositOptions,
  useCreateWallet,
  useTransactions,
  useWallets,
  useNWCBalance,
  useNWCInfo,
  useNWCTransactions,
  useCashuBalance,
  refreshWallet,
  Transaction,
  Unit,
} from "@/lib/wallet";
import { usePubkey } from "@/lib/account";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User } from "@/components/nostr/user";
import { MintIcon, MintName, MintLink } from "@/components/mint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EcashToken } from "@/components/cashu";
import { cn } from "@/lib/utils";

function Relay({
  url,
  isSelected,
  disabled,
  onSelectChange,
}: {
  url: string;
  isSelected: boolean;
  disabled?: boolean;
  onSelectChange: (selected: boolean) => void;
}) {
  const host = useHost(url);
  return (
    <div className="flex flex-row gap-1.5 items-center">
      <Checkbox
        disabled={disabled}
        checked={isSelected}
        onCheckedChange={onSelectChange}
      />
      <Server className="size-4 text-muted-foreground" />
      <span className="text-sm font-mono">{host}</span>
    </div>
  );
}

function Mint({
  url,
  isSelected,
  disabled,
  onSelectChange,
}: {
  url: string;
  isSelected: boolean;
  disabled?: boolean;
  onSelectChange: (selected: boolean) => void;
}) {
  const host = useHost(url);
  return (
    <div className="flex flex-row gap-1.5 items-center">
      <Checkbox
        disabled={disabled}
        checked={isSelected}
        onCheckedChange={onSelectChange}
      />
      <Landmark className="size-4 text-muted-foreground" />
      <span className="text-sm font-mono">{host}</span>
    </div>
  );
}

export function CreateWallet() {
  const { t } = useTranslation();
  const myRelays = useRelays();
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mint, setMint] = useState("");
  const [relay, setRelay] = useState("");
  const [mints, setMints] = useState<string[]>(defaultMints);
  const [selectedMints, setSelectedMints] = useState<string[]>(defaultMints);
  const [relays, setRelays] = useState<string[]>(myRelays);
  const [selectedRelays, setSelectedRelays] = useState<string[]>(myRelays);
  const createWallet = useCreateWallet();

  function addToMints() {
    // todo: check if valid mint
    setMints([...mints, mint]);
    setSelectedMints([...selectedMints, mint]);
    setMint("");
  }

  function addToRelays() {
    // todo: check valid relay URL
    setRelays([...relays, relay]);
    setSelectedRelays([...selectedRelays, relay]);
    setRelay("");
  }

  async function onCreate() {
    try {
      setIsCreating(true);
      await createWallet(selectedMints, selectedRelays);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
      setIsOpen(false);
    }
  }

  function selectMint(mint: string) {
    setSelectedMints([...selectedMints, mint]);
  }

  function deselectMint(mint: string) {
    setSelectedMints(selectedMints.filter((m) => m !== mint));
  }

  function selectRelay(relay: string) {
    setSelectedRelays([...selectedRelays, relay]);
  }

  function deselectRelay(relay: string) {
    setSelectedRelays(selectedRelays.filter((r) => r !== relay));
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <WalletIcon />
          {t("wallet.create")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <Label>{t("wallet.mints")}</Label>
            <span className="text-xs text-muted-foreground">
              {t("wallet.mints-description")}
            </span>
            <div className="flex flex-col gap-1 my-2 mx-3">
              {mints.map((m) => (
                <Mint
                  key={m}
                  url={m}
                  disabled={
                    selectedMints.length === 1 && selectedMints[0] === m
                  }
                  isSelected={selectedMints.includes(m)}
                  onSelectChange={(checked) =>
                    checked ? selectMint(m) : deselectMint(m)
                  }
                />
              ))}
            </div>
            <div className="flex flex-row gap-2">
              <Input
                className="w-full"
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                placeholder="https://"
              />
              <Button disabled={mint.trim().length === 0} onClick={addToMints}>
                <Plus /> {t("wallet.add-mint")}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <Label>{t("wallet.relays")}</Label>
            <span className="text-xs text-muted-foreground">
              {t("wallet.relays-description")}
            </span>
            <div className="flex flex-col gap-1 my-2 mx-3">
              {relays.map((r) => (
                <Relay
                  key={r}
                  url={r}
                  disabled={
                    selectedRelays.length === 1 && selectedRelays[0] === r
                  }
                  isSelected={selectedRelays.includes(r)}
                  onSelectChange={(checked) =>
                    checked ? selectRelay(r) : deselectRelay(r)
                  }
                />
              ))}
            </div>
            <div className="flex flex-row gap-2">
              <Input
                className="w-full"
                value={relay}
                onChange={(e) => setRelay(e.target.value)}
                placeholder="wss://"
              />
              <Button
                disabled={!relay.trim().startsWith("wss://")}
                onClick={addToRelays}
              >
                <PackagePlus /> {t("wallet.add-relay")}
              </Button>
            </div>
          </div>
          <Button
            disabled={
              isCreating ||
              selectedRelays.length === 0 ||
              selectedMints.length === 0
            }
            className="w-full"
            onClick={onCreate}
          >
            <WalletIcon /> {t("wallet.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EditWallet({
  wallet,
  children,
}: {
  wallet: NDKCashuWallet;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const myRelays = useRelays();
  const ndk = useNDK();
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mint, setMint] = useState("");
  const [relay, setRelay] = useState("");
  const [mints, setMints] = useState<string[]>(wallet.mints);
  const [selectedMints, setSelectedMints] = useState<string[]>(wallet.mints);
  const [relays, setRelays] = useState<string[]>(
    wallet.relaySet?.relayUrls || myRelays,
  );
  const [selectedRelays, setSelectedRelays] = useState<string[]>(
    wallet.relaySet?.relayUrls || myRelays,
  );

  function addToMints() {
    // todo: check if valid mint
    setMints([...mints, mint]);
    setSelectedMints([...selectedMints, mint]);
    setMint("");
  }

  function addToRelays() {
    // todo: check valid relay URL
    setRelays([...relays, relay]);
    setSelectedRelays([...selectedRelays, relay]);
    setRelay("");
  }

  async function onEdit() {
    try {
      setIsEditing(true);
      wallet.mints = selectedMints;
      wallet.relaySet = NDKRelaySet.fromRelayUrls(selectedRelays, ndk);
      await wallet.publish();
      const p2pk = await wallet.getP2pk();
      const event = new NDKEvent(ndk, {
        kind: NDKKind.CashuMintList,
        tags: [
          ["pubkey", p2pk],
          ...selectedRelays.map((r) => ["relay", r]),
          ...wallet.mints.map((m) => ["mint", m]),
        ],
      } as NostrEvent);
      await event.publish(NDKRelaySet.fromRelayUrls(myRelays, ndk));
      toast.success(t("wallet.saved"));
    } catch (err) {
      console.error(err);
      toast.error(t("wallet.save-error"));
    } finally {
      setIsEditing(false);
      setIsOpen(false);
    }
  }

  function selectMint(mint: string) {
    setSelectedMints([...selectedMints, mint]);
  }

  function deselectMint(mint: string) {
    setSelectedMints(selectedMints.filter((m) => m !== mint));
  }

  function selectRelay(relay: string) {
    setSelectedRelays([...selectedRelays, relay]);
  }

  function deselectRelay(relay: string) {
    setSelectedRelays(selectedRelays.filter((r) => r !== relay));
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button variant="ghost" size="icon">
            <Settings />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("wallet.settings.title")}</DialogTitle>
          <DialogDescription>
            {t("wallet.settings.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="w-full flex flex-col gap-4">
          <WalletBalance wallet={wallet} />
          <div className="flex flex-col gap-0.5">
            <Label>{t("wallet.mints")}</Label>
            <span className="text-xs text-muted-foreground">
              {t("wallet.mints-description")}
            </span>
            <div className="flex flex-col gap-1 my-2 mx-3">
              {mints.map((m) => (
                <Mint
                  key={m}
                  url={m}
                  disabled={
                    selectedMints.length === 1 && selectedMints[0] === m
                  }
                  isSelected={selectedMints.includes(m)}
                  onSelectChange={(checked) =>
                    checked ? selectMint(m) : deselectMint(m)
                  }
                />
              ))}
            </div>
            <div className="flex flex-row gap-2">
              <Input
                className="w-full"
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                placeholder="https://"
              />
              <Button disabled={mint.trim().length === 0} onClick={addToMints}>
                <Plus /> {t("wallet.add-mint")}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <Label>{t("wallet.relays")}</Label>
            <span className="text-xs text-muted-foreground">
              {t("wallet.relays-description")}
            </span>
            <div className="flex flex-col gap-1 my-2 mx-3">
              {relays.map((r) => (
                <Relay
                  key={r}
                  url={r}
                  disabled={
                    selectedRelays.length === 1 && selectedRelays[0] === r
                  }
                  isSelected={selectedRelays.includes(r)}
                  onSelectChange={(checked) =>
                    checked ? selectRelay(r) : deselectRelay(r)
                  }
                />
              ))}
            </div>
            <div className="flex flex-row gap-2">
              <Input
                className="w-full"
                value={relay}
                onChange={(e) => setRelay(e.target.value)}
                placeholder="wss://"
              />
              <Button
                disabled={!relay.trim().startsWith("wss://")}
                onClick={addToRelays}
              >
                <PackagePlus /> {t("wallet.add-relay")}
              </Button>
            </div>
          </div>
          <Button
            disabled={
              isEditing ||
              selectedRelays.length === 0 ||
              selectedMints.length === 0
            }
            className="w-full"
            onClick={onEdit}
          >
            {isEditing ? <RotateCw className="animate-spin" /> : <Save />}{" "}
            {t("wallet.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectWallet() {
  const { t } = useTranslation();
  const nwcNdk = useNWCNDK();
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingWebln, setIsLoadingWebln] = useState(false);
  const [connectString, setConnectString] = useState("");
  const [, setWallets] = useWallets();
  const [, setNDKWallets] = useNDKWallets();
  const isValidNwcString = connectString.startsWith("nostr+walletconnect://");

  function connectWebln() {
    if (!isLoadingWebln) {
      toast.error(t("wallet.dialog.webln-unavailable"));
      return;
    }
    try {
      setIsLoadingWebln(true);
      const wallet = new NDKWebLNWallet();
      setWallets((ws) => [{ type: "webln" }, ...ws]);
      setNDKWallets((ws) => [...ws, wallet]);
      setIsOpen(false);
      toast.success(t("wallet.dialog.webln-connected"));
    } catch (e) {
      console.error(e);
      toast.error(t("wallet.dialog.webln-error"));
    } finally {
      setIsLoadingWebln(false);
    }
  }

  async function connectNwc() {
    if (!connectString) {
      toast.error(t("wallet.dialog.nwc-empty"));
      return;
    }
    try {
      setIsConnecting(true);
      const u = new URL(connectString);
      const relayUrls = u.searchParams.getAll("relay");
      for (const relay of relayUrls) {
        nwcNdk.addExplicitRelay(relay);
      }
      const nwc = new NDKNWCWallet(nwcNdk, {
        timeout: 20_000,
        pairingCode: connectString,
      });
      try {
        setIsConnecting(true);
        setWallets((ws) => [...ws, { type: "nwc", connection: connectString }]);
        setNDKWallets((ws) => [...ws, nwc]);
        nwc.on("ready", () => {
          setIsConnecting(false);
          setIsOpen(false);
          toast.success(t("wallet.dialog.nwc-connected"));
        });
      } catch (e) {
        console.error(e);
        toast.error(t("wallet.dialog.nwc-error"));
      }
    } catch (e) {
      console.error(e);
      toast.error(t("wallet.dialog.nwc-error"));
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={isConnecting}>
          <PlugZap />
          {t("wallet.connect")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("wallet.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("wallet.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Input
            disabled={isConnecting}
            placeholder="nostr+walletconnect://"
            value={connectString}
            onChange={(e) => setConnectString(e.target.value)}
          />
          <Button
            disabled={!isValidNwcString || isConnecting}
            variant="secondary"
            onClick={connectNwc}
          >
            {isConnecting ? <RotateCw className="animate-spin" /> : <Cable />}
            {t("wallet.dialog.connect-nip60")}
          </Button>
        </div>
        <p className="my-2 mx-auto text-xs text-muted-foreground">
          {t("user.login.or")}
        </p>
        <div className="flex flex-col gap-3">
          <Button
            variant="secondary"
            disabled={isLoadingWebln || !window.webln}
            onClick={connectWebln}
          >
            {isLoadingWebln ? (
              <RotateCw className="animate-spin" />
            ) : (
              <Puzzle />
            )}
            {t("wallet.dialog.connect-webln")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Tx({ tx }: { tx: Transaction }) {
  const { t } = useTranslation();
  const myRelays = useRelays();
  const [isOpen, setIsOpen] = useState(false);
  const isCredit = tx.direction === "in";
  const amount = tx.unit === "msat" ? tx.amount / 1000 : tx.amount;
  const fee = tx.fee;
  const target = tx.p || tx.zap?.p;
  const nutzapId = tx.tags.find(
    (t) => t[0] === "e" && t[3] === "redeemed",
  )?.[1];
  const nutzapPubkey = tx.tags.find(
    (t) => t[0] === "e" && t[3] === "redeemed",
  )?.[4];
  const { data: nutzap } = useEvent({
    id: nutzapId,
    pubkey: nutzapPubkey,
    relays: myRelays,
  });
  const author = nutzap?.pubkey || tx.pubkey || tx.zap?.pubkey;
  const e = nutzap?.tags.find((t) => t[0] === "e")?.[1] || tx.e || tx.zap?.e;
  const a = nutzap?.tags.find((t) => t[0] === "a")?.[1] || tx.a || tx.zap?.a;
  const description = nutzap?.content || tx.description || tx.zap?.content;
  // todo: a
  const component = (
    <div className="flex flex-row justify-between p-1 items-center hover:bg-accent rounded-sm">
      <div className="flex flex-row gap-2 items-center">
        {isCredit ? (
          author ? (
            <div className="size-16 relative flex items-center justify-center">
              <User
                pubkey={author}
                classNames={{
                  wrapper: "flex-col gap-0",
                  avatar: "size-10",
                  name: "text-xs font-light text-muted-foreground line-clamp-1",
                }}
              />
              <ArrowDownRight className="size-5 text-green-200 absolute top-0 left-0" />
            </div>
          ) : (
            <div className="size-16 relative">
              <ArrowDownRight className="size-14 text-green-200" />
            </div>
          )
        ) : target ? (
          <div className="size-16 relative flex items-center justify-center">
            <User
              pubkey={target}
              classNames={{
                wrapper: "flex-col gap-0",
                avatar: "size-10",
                name: "text-xs font-light text-muted-foreground line-clamp-1",
              }}
            />
            <ArrowUpRight className="size-5 text-destructive absolute -top-1.5 right-0" />
          </div>
        ) : (
          <div className="size-16 relative flex items-center justify-center">
            <ArrowUpRight className="size-14 text-destructive" />
          </div>
        )}
        <div className="flex flex-col items-start gap-0.5">
          {description && !tx.zap ? (
            <RichText
              tags={nutzap?.tags || tx.tags}
              className="text-md text-start line-clamp-1"
              options={{ inline: true }}
            >
              {description}
            </RichText>
          ) : tx.zap?.content.trim() ? (
            <RichText
              tags={tx.zap.tags}
              className="text-md line-clamp-1"
              options={{ inline: true }}
            >
              {tx.zap.content.trim()}
            </RichText>
          ) : (
            <div className="flex flex-col gap-0 items-start">
              <span className="text-md text-muted-foreground">
                {isCredit ? t("wallet.credit") : t("wallet.debit")}
              </span>
            </div>
          )}
          {tx.mint ? (
            <MintLink
              url={tx.mint}
              classNames={{ icon: "size-3", name: "text-xs" }}
            />
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-0 items-end">
        <div className="flex flex-row gap-0.5 items-center">
          {tx.unit === "msat" || tx.unit === "sat" ? (
            <Bitcoin className="size-6 text-muted-foreground" />
          ) : tx.unit === "eur" ? (
            <Euro className="size-6 text-muted-foreground" />
          ) : tx.unit === "usd" ? (
            <DollarSign className="size-6 text-muted-foreground" />
          ) : (
            <Banknote className="size-6 text-muted-foreground" />
          )}
          <span className="font-mono text-3xl">
            {formatShortNumber(amount)}
          </span>
        </div>
        {fee ? (
          <div className="flex flex-row items-center gap-0.5">
            <span className="font-mono text-xs text-muted-foreground">
              {t("ecash.fee")}
            </span>
            {tx.unit === "msat" || tx.unit === "sat" ? (
              <Bitcoin className="size-3 text-muted-foreground" />
            ) : tx.unit === "eur" ? (
              <Euro className="size-3 text-muted-foreground" />
            ) : tx.unit === "usd" ? (
              <DollarSign className="size-3 text-muted-foreground" />
            ) : (
              <Banknote className="size-3 text-muted-foreground" />
            )}
            <span className="font-mono text-xs">{formatShortNumber(fee)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
  return e || a ? (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>{component}</DialogTrigger>
      <DialogContent className="bg-transparent border-none">
        {e ? (
          <Event
            id={e}
            relays={myRelays}
            pubkey={target}
            showReactions={false}
          />
        ) : a ? (
          <A address={a} showReactions={false} />
        ) : null}
      </DialogContent>
    </Dialog>
  ) : (
    component
  );
}

interface ProofInfo {
  mint: string;
  state: string; // "available"
  tokenId?: string;
  timestamp: number;
  proof: CashuProof;
}

interface CashuProof {
  id: string;
  amount: number;
  C: string;
  secret: string;
}

function Proof({ info }: { info: ProofInfo }) {
  return (
    <div className="p-2">
      <div className="flex flex-row items-center justify-between">
        <MintLink
          url={info.mint}
          classNames={{ icon: "size-8", name: "text-md" }}
        />
        <div className="flex flex-row gap-0.5 items-center">
          <Bitcoin className="size-6 text-muted-foreground" />
          <span className="text-2xl font-mono">{info.proof.amount}</span>
        </div>
      </div>
    </div>
  );
}

export function CustomWalletSelector({
  wallets,
  placeholder,
  onWalletSelected,
}: {
  wallets: NDKWallet[];
  placeholder?: string;
  onWalletSelected: (wallet: NDKWallet) => void;
}) {
  const { t } = useTranslation();
  function onWalletChange(walletId: string) {
    const w = wallets.find((w) => w.walletId === walletId);
    if (w) {
      onWalletSelected(w);
    }
  }
  return (
    <Select disabled={wallets.length === 0} onValueChange={onWalletChange}>
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={placeholder || t("wallet.choose-wallet-placeholder")}
        />
      </SelectTrigger>
      <SelectContent>
        {wallets.map((w) => (
          <SelectItem key={w.walletId} value={w.walletId}>
            <WalletBalance wallet={w} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function WalletSelector() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useNDKWallet();
  const [wallets] = useNDKWallets();
  function onWalletChange(walletId: string) {
    const w = wallets.find((w) => w.walletId === walletId);
    if (w) {
      setWallet(w);
    }
  }
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-row items-center gap-1">
        <WalletIcon className="size-4 text-muted-foreground" />
        <h4 className="text-sm text-muted-foreground uppercase font-light">
          {t("wallet.choose-wallet")}
        </h4>
      </div>
      <Select
        disabled={wallets.length === 0}
        onValueChange={onWalletChange}
        defaultValue={wallet?.walletId}
        value={wallet?.walletId}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("wallet.choose-wallet-placeholder")} />
        </SelectTrigger>
        <SelectContent>
          {wallets.map((w) => (
            <SelectItem key={w.walletId} value={w.walletId}>
              <WalletBalance wallet={w} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CashuWalletCoins({ wallet }: { wallet: NDKCashuWallet }) {
  const proofs = wallet.state.getProofEntries({ onlyAvailable: true });
  return (
    <ScrollArea className="h-[28rem]">
      <div className="flex flex-col gap-1 pr-3">
        {proofs.map((info: ProofInfo) => (
          <Proof key={info.proof.C} info={info} />
        ))}
      </div>
    </ScrollArea>
  );
}

function WalletTransactions({
  wallet,
  pubkey,
}: {
  wallet: NDKCashuWallet;
  pubkey: string;
}) {
  const { t } = useTranslation();
  const transactions = useTransactions(pubkey, wallet);
  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) => b.created_at - a.created_at);
  }, [transactions]);
  return (
    <ScrollArea className="h-[28rem]">
      <div className="flex flex-col gap-2 pr-3">
        {sorted.length === 0 ? (
          <div className="h-[28rem] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <CircleSlash2 className="size-6" />
              <span className="text-sm text-muted-foreground">
                {t("wallet.no-transactions")}
              </span>
            </div>
          </div>
        ) : null}
        {sorted.map((tx) => (
          <Tx key={tx.id} tx={tx} />
        ))}
      </div>
    </ScrollArea>
  );
}

interface WalletActionsProps {
  onDeposit: () => void;
  isDepositing: boolean;
  canDeposit?: boolean;
  onWithdraw: () => void;
  isWithdrawing: boolean;
  canWithdraw?: boolean;
}

// todo: confirm step
// target: pubkey, ln address, lnurl, invoice
// - payment amount
// - wallet
// - confirm

function WalletActions({
  onDeposit,
  isDepositing,
  canDeposit = true,
  onWithdraw,
  isWithdrawing,
  canWithdraw = true,
}: WalletActionsProps) {
  const { t } = useTranslation();

  function onScan(result: string) {
    // todo: ln invoice
    // todo: npub,nprofile
    // todo: lnurl
    // todo: ecash
    // todo: cashu request
    console.log("SCANNED", result);
  }

  return (
    <div className="flex flex-row gap-2 justify-around">
      <Button
        variant="outline"
        className="flex-1"
        disabled={isDepositing || !canDeposit}
        onClick={onDeposit}
      >
        {isDepositing ? (
          <RotateCw className="animate-spin" />
        ) : (
          <ArrowDownRight />
        )}
        {t("wallet.deposit.title")}
      </Button>
      <QRScanner onScan={onScan} />
      <Button
        variant="outline"
        className="flex-1"
        disabled={isWithdrawing || !canWithdraw}
        onClick={onWithdraw}
      >
        {isWithdrawing ? (
          <RotateCw className="animate-spin" />
        ) : (
          <ArrowUpRight />
        )}
        {t("wallet.withdraw.title")}
      </Button>
    </div>
  );
}

//function RelayList({ relays }: { relays: string[] }) {
//  const { t } = useTranslation();
//  return (
//    <div className="flex flex-col gap-1">
//      <div className="flex flex-row gap-1 items-center">
//        <Server className="size-4 text-muted-foreground" />
//        <h4 className="text-sm text-muted-foreground uppercase font-light">
//          {t("wallet.relays")}
//        </h4>
//      </div>
//      <ul className="p-1 flex flex-col gap-0.5">
//        {relays.map((r) => (
//          <li key={r} className="flex flex-row items-center gap-1.5">
//            <RelayIcon relay={r} className="size-4" />
//            <span className="text-sm">
//              <RelayName relay={r} />
//            </span>
//          </li>
//        ))}
//      </ul>
//    </div>
//  );
//}
function Withdraw({
  wallet,
  open,
  onOpenChange,
}: {
  wallet: NDKWallet;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [lnAddress, setLnAddress] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [relays, setRelays] = useState<string[]>([]);
  const [ecash, setEcash] = useState<Token | null>(null);
  const [token, setToken] = useState<string>("");
  const [amount, setAmount] = useState("21");
  const [ndkWallets] = useNDKWallets();
  const otherWallets = ndkWallets.filter((w) => w.walletId !== wallet.walletId);
  const [toWallet, setToWallet] = useState<NDKWallet | null>(null);
  const [invoice, setInvoice] = useState("");
  const [message, setMessage] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { t } = useTranslation();
  const isAmountValid = amount && Number(amount) > 0;
  const content = invoice.trim();
  const isNostrProfile =
    content.startsWith("nostr:npub") || content.startsWith("nostr:nprofile");
  const isLnAddress = content.includes("@");
  const isLnInvoice = content.startsWith("ln");

  function onClose(open?: boolean) {
    if (!open) {
      setToWallet(null);
      setInvoice("");
      setMessage("");
      setAmount("21");
      setToken("");
      setEcash(null);
    }
    onOpenChange?.(Boolean(open));
  }

  async function onWithdraw() {
    // todo: ln address, cashu payment request
    try {
      setIsWithdrawing(true);
      if (isNostrProfile) {
        const decoded = nip19.decode(content.replace(/^nostr:/, ""));
        if (decoded) {
          // todo: pubkey, amount
        }
      } else if (isLnAddress) {
        // todo: amount
      } else if (isLnInvoice) {
        // @ts-expect-error: Reeeee
        const result = await wallet.lnPay({ pr: content });
        if (result?.preimage) {
          toast.success(t("wallet.withdraw.success"));
          refreshWallet(wallet);
        }
      } else {
        toast.error(t("wallet.withdraw.unrecognized-invoice"));
        return;
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(t("wallet.withdraw.error"));
    } finally {
      setIsWithdrawing(false);
      setInvoice("");
      setMessage("");
    }
  }

  async function createOutTxEvent(
    wallet: NDKCashuWallet,
    paymentRequest: any,
    paymentResult: any,
  ): Promise<NDKWalletChange> {
    let description: string | undefined = paymentRequest.paymentDescription;
    const amount = paymentRequest.amount;

    if (!amount) {
      console.error(
        "BUG: Unable to find amount for paymentRequest",
        paymentRequest,
      );
    }

    const historyEvent = new NDKWalletChange(wallet.ndk);

    if (wallet.event) historyEvent.tags.push(wallet.event.tagReference());
    historyEvent.direction = "out";
    historyEvent.amount = amount ?? 0;
    historyEvent.mint = paymentResult.mint;
    historyEvent.description = description;
    if (paymentResult.fee) historyEvent.fee = paymentResult.fee;
    if (paymentResult.stateUpdate?.created)
      historyEvent.createdTokens = [paymentResult.stateUpdate.created];
    if (paymentResult.stateUpdate?.deleted)
      historyEvent.destroyedTokenIds = paymentResult.stateUpdate.deleted;
    if (paymentResult.stateUpdate?.reserved)
      historyEvent.reservedTokens = [paymentResult.stateUpdate.reserved];

    await historyEvent.sign();
    historyEvent.publish(wallet.relaySet);

    return historyEvent;
  }

  // todo: update NDK so this can be done in a more elegant way
  async function mintAmount(w: NDKCashuWallet, totalAmount: number) {
    let result;
    const amounts = decomposeIntoPowers(totalAmount);
    for (const mint of w.mints) {
      const wallet = await w.cashuWallet(mint);
      const mintProofs = await w.state.getProofs({ mint });
      result = await wallet.send(totalAmount, mintProofs, {
        proofsWeHave: mintProofs,
        includeFees: true,
        outputAmounts: {
          sendAmounts: amounts,
        },
      });

      if (result.send.length > 0) {
        const change = {
          store: result?.keep ?? [],
          destroy: result.send,
          mint,
        };
        const updateRes = await w.state.update(change);
        // create a change event
        createOutTxEvent(
          w,
          {
            paymentDescription: "minted nuts",
            amount: amounts.reduce((acc, amount) => acc + amount, 0),
          },
          {
            result: { proofs: result.send, mint },
            proofsChange: change,
            stateUpdate: updateRes,
            mint,
            fee: 0,
          },
        );
        return {
          mint,
          proofs: result.send,
        };
      }
    }
  }

  async function onWithdrawCash() {
    try {
      setIsWithdrawing(true);
      if (wallet instanceof NDKCashuWallet) {
        const ecash = await mintAmount(wallet, Number(amount));
        if (ecash) {
          setEcash(ecash);
          const token = getEncodedToken(ecash);
          setToken(token);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(t("wallet.withdraw.error"));
    } finally {
      setIsWithdrawing(false);
      setInvoice("");
    }
  }

  async function onWithdrawToWallet() {
    if (!toWallet) {
      toast.error(t("wallet.withdraw.no-wallet"));
      return;
    }
    try {
      setIsWithdrawing(true);
      if (toWallet instanceof NDKNWCWallet) {
        const result = await toWallet.makeInvoice(
          Number(amount) * 1000,
          message,
        );
        // @ts-expect-error: incorrect return type
        await wallet.lnPay({ pr: result.invoice });
        toast.success(t("wallet.withdraw.success"));
      } else if (toWallet instanceof NDKWebLNWallet) {
        const result = await toWallet.provider?.makeInvoice({
          amount: Number(amount) * 1000,
          defaultMemo: message,
        });
        // @ts-expect-error: incorrect return type
        await wallet.lnPay({ pr: result.paymentRequest });
        toast.success(t("wallet.withdraw.success"));
      } else if (toWallet instanceof NDKCashuWallet) {
        const deposit = toWallet.deposit(
          Number(amount) * 1000,
          toWallet.mints[0],
        );
        deposit.on("success", () =>
          toast.success(t("wallet.withdraw.success")),
        );
        deposit.on("error", () => toast.success(t("wallet.withdraw.error")));
        const result = await deposit.start();
        // @ts-expect-error: incorrect return type
        await wallet.lnPay({ pr: result.paymentRequest });
        toast.success(t("wallet.withdraw.success"));
      }
      refreshWallet(wallet);
      refreshWallet(toWallet);
      onClose();
    } catch (err) {
      toast.error(t("wallet.withdraw.error"));
    } finally {
      setIsWithdrawing(false);
      setInvoice("");
      setMessage("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-96">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-row items-center gap-1">
              {t("wallet.withdraw.title")}{" "}
              <ArrowUpRight className="text-muted-foreground" />
            </div>
          </DialogTitle>
          <DialogDescription>
            {t("wallet.withdraw.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          {ecash && token ? (
            <EcashToken token={token} />
          ) : (
            <div className="flex flex-col gap-1">
              <div className="mx-2">
                <Label>{t("wallet.deposit.amount")}</Label>
                <AmountInput amount={amount} setAmount={setAmount} />
              </div>
              <Label className="mx-2">{t("wallet.withdraw.to")}</Label>
              <AutocompleteTextarea
                className="rounded-sm shadow-none text-sm"
                message={invoice}
                placeholder={t("wallet.withdraw.placeholder")}
                setMessage={setInvoice}
                minRows={1}
                maxRows={1}
                submitOnEnter={false}
                disableEmojiAutocomplete
              />
              {pubkey || lnAddress ? (
                <>
                  <Label className="mx-2">{t("wallet.withdraw.message")}</Label>
                  <AutocompleteTextarea
                    className="rounded-sm shadow-none text-sm"
                    message={message}
                    placeholder={t("wallet.withdraw.message-placeholder")}
                    setMessage={setMessage}
                    minRows={3}
                    maxRows={6}
                    submitOnEnter={false}
                  />
                </>
              ) : null}
              <div className="mx-2 flex flex-row items-center gap-2">
                <Button
                  disabled={isWithdrawing || !invoice || !isAmountValid}
                  onClick={onWithdraw}
                  className="w-full flex-1"
                  variant="outline"
                >
                  <Coins />
                  {t("wallet.withdraw.confirm")}
                </Button>
                {wallet instanceof NDKCashuWallet && (
                  <Button
                    disabled={isWithdrawing || !isAmountValid}
                    onClick={onWithdrawCash}
                    className="w-full flex-1"
                    variant="outline"
                  >
                    <Banknote />
                    {t("wallet.withdraw.confirm-cash")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        {otherWallets.length > 0 ? (
          <>
            <p className="mx-auto text-xs text-muted-foreground">
              {t("user.login.or")}
            </p>
            <div className="flex flex-col gap-2 mx-2">
              <CustomWalletSelector
                placeholder={t("wallet.withdraw.to-wallet")}
                wallets={otherWallets}
                onWalletSelected={(w) => {
                  setToWallet(w);
                }}
              />
              <Button
                disabled={isWithdrawing || !toWallet || !isAmountValid}
                onClick={onWithdrawToWallet}
                className="w-full"
                variant="outline"
              >
                <WalletIcon />
                {t("wallet.withdraw.confirm-wallet")}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AmountInput({
  amount,
  setAmount,
}: {
  amount: string;
  setAmount: (amount: string) => void;
}) {
  return (
    <div className="flex flex-row gap-4 items-center mx-2">
      <Bitcoin className="size-14 text-muted-foreground" />
      <Input
        type="number"
        className="w-full text-center font-mono text-6xl h-15"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
    </div>
  );
}

function Deposit({
  wallet,
  open,
  onOpenChange,
}: {
  wallet: NDKWallet;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [token, setToken] = useState<string>("");
  const ecash = useMemo(() => {
    if (token) {
      return getDecodedToken(token);
    }
  }, [token]);
  const [isDepositing, setIsDepositing] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [amount, setAmount] = useState("21");
  const [mint, setMint] = useState<string | undefined>(
    wallet instanceof NDKCashuWallet ? wallet.mints[0] : undefined,
  );
  const deposit = useDeposit(wallet);
  const { t } = useTranslation();
  const [ndkWallets] = useNDKWallets();
  const otherWallets = ndkWallets.filter((w) => w.walletId !== wallet.walletId);
  const [toWallet, setToWallet] = useState<NDKWallet | null>(null);
  const isAmountValid = amount && Number(amount) > 0;

  async function onDeposit() {
    try {
      setIsDepositing(true);
      const options: DepositOptions = { amount: Number(amount) };
      if (mint) {
        options.mint = mint;
      }
      const pr = await deposit(
        options,
        () => {
          toast.success(t("wallet.deposit.success"));
        },
        () => {
          toast.error(t("wallet.deposit.error"));
        },
      );
      setInvoice(pr);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDepositing(false);
    }
  }

  async function onRedeem() {
    try {
      if (!ecash || !token) return;
      setIsDepositing(true);
      if (wallet instanceof NDKCashuWallet) {
        await wallet.receiveToken(token);
      } else if (wallet instanceof NDKWebLNWallet) {
        console.log("TODO");
      } else if (wallet instanceof NDKNWCWallet) {
        console.log("TODO");
      }
      toast.success(t("wallet.deposit.redeem-success"));
      refreshWallet(wallet);
      onOpenChange?.(false);
    } catch (err) {
      console.error(err);
      toast.error(t("wallet.deposit.redeem-error"));
    } finally {
      setIsDepositing(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setInvoice(null);
      setIsDepositing(false);
      setAmount("21");
      setMint(wallet instanceof NDKCashuWallet ? wallet.mints[0] : undefined);
      setToWallet(null);
    }
    onOpenChange?.(open);
  }

  async function onDepositWithWallet() {
    if (!toWallet) {
      toast.error(t("wallet.deposit.no-wallet"));
      return;
    }
    if (!invoice) {
      toast.error(t("wallet.deposit.no-invoice"));
      return;
    }
    try {
      setIsDepositing(true);
      // @ts-expect-error: incorrect typing?
      await toWallet.lnPay({ pr: invoice });
      toast.success(t("wallet.withdraw.success"));
      refreshWallet(wallet);
      refreshWallet(toWallet);
      handleOpenChange(false);
    } catch (err) {
      toast.error(t("wallet.withdraw.error"));
    } finally {
      setIsDepositing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-96">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-row items-center gap-1">
              {t("wallet.deposit.title")}
              <ArrowDownRight className="text-muted-foreground" />
            </div>
          </DialogTitle>
          <DialogDescription>
            {wallet instanceof NDKCashuWallet
              ? t("wallet.deposit.cashu-description")
              : t("wallet.deposit.description")}
          </DialogDescription>
        </DialogHeader>
        {invoice ? (
          <div className="flex flex-col items-center gap-1">
            <Invoice invoice={invoice} />
            <p className="my-2 mx-auto text-xs text-muted-foreground">
              {t("user.login.or")}
            </p>
            <div className="flex flex-col gap-2 mx-2 w-[264px]">
              <CustomWalletSelector
                placeholder={t("wallet.deposit.from-wallet")}
                wallets={otherWallets}
                onWalletSelected={(w) => {
                  setToWallet(w);
                }}
              />
              <Button
                disabled={isDepositing || !toWallet || !isAmountValid}
                onClick={onDepositWithWallet}
                className="w-full"
                variant="outline"
              >
                <WalletIcon />
                {t("wallet.deposit.confirm-wallet")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label>{t("wallet.deposit.amount")}</Label>
              <AmountInput amount={amount} setAmount={setAmount} />
            </div>
            <div className="flex flex-col gap-1">
              {wallet instanceof NDKCashuWallet ? (
                <>
                  <Label>{t("wallet.deposit.mint")}</Label>
                  <Select
                    disabled={isDepositing || wallet.mints.length < 2}
                    onValueChange={setMint}
                    defaultValue={mint}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose mint" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallet.mints.map((m) => (
                        <SelectItem key={m} value={m}>
                          <div className="flex flex-row items-center gap-1">
                            <MintIcon url={m} className="size-5" />
                            <MintName url={m} className="text-md" />
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : null}
              <Button
                variant="outline"
                disabled={isDepositing}
                onClick={onDeposit}
              >
                <HandCoins />
                {t("wallet.deposit.confirm")}
              </Button>
            </div>
            {wallet instanceof NDKCashuWallet ? (
              <>
                <p className="my-2 mx-auto text-xs text-muted-foreground">
                  {t("user.login.or")}
                </p>
                <div className="flex flex-col gap-1">
                  <Label>{t("wallet.deposit.receive-cash")}</Label>
                  <Input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    leftIcon={<Banknote />}
                    className="w-full"
                    placeholder="cashu..."
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={isDepositing || !ecash}
                  onClick={onRedeem}
                >
                  <HandCoins />
                  {t("wallet.deposit.redeem")}
                </Button>
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CashuWalletSettings({ wallet }: { wallet: NDKCashuWallet }) {
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const pubkey = usePubkey();
  const { t } = useTranslation();
  const balance = useCashuBalance(wallet);

  async function onDeposit() {
    setShowDeposit(true);
  }

  async function onWithdraw() {
    setShowWithdraw(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="w-full flex items-center justify-center">
          <div className="flex flex-row gap-0 items-center">
            <Bitcoin className="size-12 text-muted-foreground" />
            <span className="text-6xl font-mono">{balance}</span>
          </div>
        </div>
        <WalletActions
          onDeposit={onDeposit}
          isDepositing={showDeposit}
          onWithdraw={onWithdraw}
          isWithdrawing={showWithdraw}
        />
      </div>
      <Deposit
        wallet={wallet}
        open={showDeposit}
        onOpenChange={setShowDeposit}
      />
      <Withdraw
        wallet={wallet}
        open={showWithdraw}
        onOpenChange={setShowWithdraw}
      />
      {pubkey ? (
        <Tabs defaultValue="transactions">
          <TabsList className="w-full bg-background">
            <TabsTrigger value="transactions">
              <div className="flex flex-row items-center gap-1.5">
                <List className="size-4" />
                {t("wallet.transactions.title")}
              </div>
            </TabsTrigger>
            <TabsTrigger value="coins">
              <div className="flex flex-row items-center gap-1.5">
                <Banknote className="size-4" />
                {t("wallet.coins")}
              </div>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="transactions">
            <WalletTransactions wallet={wallet} pubkey={pubkey} />
          </TabsContent>
          <TabsContent value="coins">
            <CashuWalletCoins wallet={wallet} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}

function WebLNWalletSettings({ wallet }: { wallet: NDKWebLNWallet }) {
  return <>{wallet.walletId}</>;
}

function NWCWalletTransactions({ wallet }: { wallet: NDKNWCWallet }) {
  const { data: transactions, isLoading, isError } = useNWCTransactions(wallet);
  const { t } = useTranslation();

  return (
    <>
      {isLoading || isError ? (
        <div className="flex items-center justify-center w-full h-[28rem]">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            {isError ? (
              <ServerCrash className="size-5 text-destructive" />
            ) : (
              <Network className="size-5 animate-pulse" />
            )}
            {isError ? (
              <span className="text-sm text-destructive">
                {t("wallet.transactions.loading-error")}
              </span>
            ) : (
              <span className="text-sm">
                {t("wallet.transactions.loading")}
              </span>
            )}
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[28rem]">
          <div className="flex flex-col gap-2 pr-2.5">
            {transactions?.map((tx) => <Tx key={tx.id} tx={tx} />)}
          </div>
        </ScrollArea>
      )}
    </>
  );
}

function NWCWalletSettings({ wallet }: { wallet: NDKNWCWallet }) {
  const { data: amount } = useNWCBalance(wallet);
  const { data: info } = useNWCInfo(wallet);
  const isDepositSupported = info?.methods.includes("make_invoice");
  const isWithdrawalSupported = info?.methods.includes("pay_invoice");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  function onDeposit() {
    setIsDepositing(true);
  }

  function onWithdraw() {
    setIsWithdrawing(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="w-full flex items-center justify-center">
          <div className="flex flex-row gap-0 items-center">
            <Bitcoin className="size-12 text-muted-foreground" />
            <span className="text-6xl font-mono">
              {typeof amount === "number" ? amount : "-"}
            </span>
          </div>
        </div>
        <WalletActions
          onDeposit={onDeposit}
          isDepositing={isDepositing}
          canDeposit={isDepositSupported}
          onWithdraw={onWithdraw}
          isWithdrawing={isWithdrawing}
          canWithdraw={isWithdrawalSupported}
        />
      </div>
      <Deposit
        wallet={wallet}
        open={isDepositing}
        onOpenChange={setIsDepositing}
      />
      <Withdraw
        wallet={wallet}
        open={isWithdrawing}
        onOpenChange={setIsWithdrawing}
      />
      <NWCWalletTransactions wallet={wallet} />
    </div>
  );
}

export function Wallet({ wallet }: { wallet: NDKWallet }) {
  const { t } = useTranslation();

  if (wallet instanceof NDKCashuWallet) {
    return <CashuWalletSettings wallet={wallet} />;
  } else if (wallet instanceof NDKWebLNWallet) {
    return <WebLNWalletSettings wallet={wallet} />;
  } else if (wallet instanceof NDKNWCWallet) {
    return <NWCWalletSettings wallet={wallet} />;
  } else {
    return (
      <span className="text-xs text-muted-foreground">
        {t("wallet.not-found")}
      </span>
    );
  }
}

export function WalletSettings() {
  const wallet = useCashuWallet();
  return wallet ? <Wallet wallet={wallet} /> : null;
}

interface BalanceClassnames {
  icon?: string;
  text?: string;
}

function Balance({
  amount,
  unit = "sat",
  classNames,
  short = true,
}: {
  amount?: number;
  unit?: Unit;
  classNames?: BalanceClassnames;
  short?: boolean;
}) {
  return (
    <div className="flex flex-row gap-0.5 items-center">
      {unit.startsWith("msat") || unit.startsWith("sat") ? (
        <Bitcoin
          className={cn("size-4 text-muted-foreground", classNames?.icon)}
        />
      ) : unit === "eur" ? (
        <Euro
          className={cn("size-4 text-muted-foreground", classNames?.icon)}
        />
      ) : unit === "usd" ? (
        <DollarSign
          className={cn("size-4 text-muted-foreground", classNames?.icon)}
        />
      ) : (
        <Banknote
          className={cn("size-4 text-muted-foreground", classNames?.icon)}
        />
      )}
      <span className={cn("text-sm font-mono", classNames?.text)}>
        {amount ? (short ? formatShortNumber(amount) : amount) : "-"}
      </span>
    </div>
  );
}

function WebLNWalletBalance({ wallet }: { wallet: NDKWebLNWallet }) {
  return <>{wallet.walletId}</>;
}

function NWCWalletName({ wallet }: { wallet: NDKNWCWallet }) {
  const name = wallet.walletId;
  return wallet.walletService ? (
    <User
      pubkey={wallet.walletService.pubkey}
      classNames={{
        avatar: "size-4",
        name: "font-normal",
        wrapper: "gap-1",
      }}
    />
  ) : (
    <span>{name}</span>
  );
}

export function NWCWalletBalanceAmount({
  wallet,
  classNames,
}: {
  wallet: NDKNWCWallet;
  classNames?: BalanceClassnames;
}) {
  const { data: amount } = useNWCBalance(wallet);
  return <Balance short={false} amount={amount} classNames={classNames} />;
}

function NWCWalletBalance({ wallet }: { wallet: NDKNWCWallet }) {
  return (
    <div className="flex flex-row gap-6 w-full items-center justify-between">
      <div className="flex flex-row gap-2 items-center">
        <PlugZap className="size-4 text-muted-foreground" />
        <NWCWalletName wallet={wallet} />
      </div>
      <NWCWalletBalanceAmount wallet={wallet} />
    </div>
  );
}

export function CashuWalletBalanceAmount({
  wallet,
  classNames,
}: {
  wallet: NDKCashuWallet;
  classNames?: BalanceClassnames;
}) {
  const balance = useCashuBalance(wallet);
  return (
    <Balance
      short={false}
      amount={balance}
      unit="sat"
      classNames={classNames}
    />
  );
}

function CashuWalletName({ wallet }: { wallet: NDKCashuWallet }) {
  return wallet.event ? (
    <User
      pubkey={wallet.event.pubkey}
      classNames={{
        wrapper: "gap-1.5",
        avatar: "size-4",
        name: "font-normal",
      }}
    />
  ) : null;
}

function CashuWalletBalance({ wallet }: { wallet: NDKCashuWallet }) {
  const balance = useCashuBalance(wallet);
  return (
    <div className="flex flex-row gap-6 w-full items-center justify-between">
      <div className="flex flex-row gap-2 items-center">
        <WalletIcon className="size-4 text-muted-foreground" />
        <CashuWalletName wallet={wallet} />
      </div>
      <Balance short={false} amount={balance} unit="sat" />
    </div>
  );
}

export function WalletBalance({ wallet }: { wallet: NDKWallet }) {
  if (wallet instanceof NDKCashuWallet) {
    return <CashuWalletBalance wallet={wallet} />;
  } else if (wallet instanceof NDKWebLNWallet) {
    return <WebLNWalletBalance wallet={wallet} />;
  } else if (wallet instanceof NDKNWCWallet) {
    return <NWCWalletBalance wallet={wallet} />;
  } else {
    return null;
  }
}

function WebLNWalletName({ wallet }: { wallet: NDKWebLNWallet }) {
  return <span>{wallet.walletId}</span>;
}

export function WalletName({ wallet }: { wallet: NDKWallet }) {
  if (wallet instanceof NDKCashuWallet) {
    return <CashuWalletName wallet={wallet} />;
  } else if (wallet instanceof NDKWebLNWallet) {
    return <WebLNWalletName wallet={wallet} />;
  } else if (wallet instanceof NDKNWCWallet) {
    return <NWCWalletName wallet={wallet} />;
  } else {
    return null;
  }
}
