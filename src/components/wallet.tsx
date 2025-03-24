import React, { useState, useMemo } from "react";
import { InputCopy } from "@/components/ui/input-copy";
import { decode } from "light-bolt11-decoder";
import { ScrollArea } from "@/components/ui/scroll-area";
import debounce from "lodash.debounce";
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
  RefreshCw,
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
  Zap as ZapIcon,
  //KeySquare,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Pubkey } from "@/components/nostr/pubkey";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { NDKEvent, NDKKind, NDKRelaySet } from "@nostr-dev-kit/ndk";
import {
  NDKWallet,
  NDKCashuWallet,
  NDKWebLNWallet,
  NDKNWCWallet,
} from "@nostr-dev-kit/ndk-wallet";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Event, A } from "@/components/nostr/event";
import { Label } from "@/components/ui/label";
import { Invoice } from "@/components/ln";
import { useNDK, useNWCNDK } from "@/lib/ndk";
import { useRelays, useEvent, useProfile } from "@/lib/nostr";
import { formatShortNumber } from "@/lib/number";
import {
  useLnurl,
  fetchInvoice,
  isLightningAddress,
  isLnInvoice,
  isLnurl,
} from "@/lib/lnurl";
import { useHost } from "@/lib/hooks";
import {
  mintEcash,
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
  useWebLNBalance,
  useWebLNInfo,
  //useWebLNTransactions,
  useCashuBalance,
  refreshWallet,
  walletId,
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
import { cn, once } from "@/lib/utils";

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
  const [mints, setMints] = useState<string[]>([]);
  const [selectedMints, setSelectedMints] = useState<string[]>([]);
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

export function CashuWalletSettings({
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
      const allRelays = Array.from(new Set([...selectedRelays, ...myRelays]));
      const publishRelaySet = NDKRelaySet.fromRelayUrls(allRelays, ndk);
      await event.publish(publishRelaySet);
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
          <div className="flex flex-col gap-0.5">
            <Label>{t("wallet.keys")}</Label>
            <span className="text-xs text-muted-foreground">
              {t("wallet.keys-description")}
            </span>
            <ScrollArea className="h-20">
              <div className="flex flex-col gap-3 my-2 mx-3">
                {wallet.p2pks.map((p2pk) => {
                  const privkey = wallet.privkeys.get(p2pk)?.privateKey;
                  return (
                    <div className="flex flex-col gap-1">
                      <Pubkey
                        key={p2pk}
                        pubkey={p2pk}
                        chunkSize={16}
                        isCashu
                        iconClassname="size-4"
                        textClassname="text-sm"
                      />
                      {privkey ? (
                        <InputCopy
                          //leftIcon={<KeySquare className="size-4" />}
                          isSecret
                          value={privkey}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
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
  const ndk = useNWCNDK();
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingWebln, setIsLoadingWebln] = useState(false);
  const [connectString, setConnectString] = useState("");
  const [, setWallets] = useWallets();
  const [, setNDKWallets] = useNDKWallets();
  const isValidNwcString = connectString.startsWith("nostr+walletconnect://");

  function connectWebln() {
    if (isLoadingWebln) {
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
    if (isConnecting) return;

    if (!connectString) {
      toast.error(t("wallet.dialog.nwc-empty"));
      return;
    }

    try {
      setIsConnecting(true);
      const nwc = new NDKNWCWallet(ndk, {
        timeout: 10_000,
        pairingCode: connectString,
      });
      setWallets((ws) => [...ws, { type: "nwc", connection: connectString }]);
      setNDKWallets((ws) => [...ws, nwc]);
      nwc.on(
        "ready",
        once(() => {
          setIsConnecting(false);
          setIsOpen(false);
          toast.success(t("wallet.dialog.nwc-connected"));
        }),
      );
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
            disabled={isConnecting || isLoadingWebln}
            placeholder="nostr+walletconnect://"
            value={connectString}
            onChange={(e) => setConnectString(e.target.value)}
          />
          <Button
            disabled={!isValidNwcString || isConnecting || isLoadingWebln}
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
            disabled={isLoadingWebln || !window.webln || isConnecting}
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
  const groupRelay = nutzap?.tags.find((t) => t[0] === "h")?.[2];
  const author = nutzap?.pubkey || tx.pubkey || tx.zap?.pubkey;
  const e = nutzap?.tags.find((t) => t[0] === "e")?.[1] || tx.e || tx.zap?.e;
  const a = nutzap?.tags.find((t) => t[0] === "a")?.[1] || tx.a || tx.zap?.a;
  const description = nutzap?.content || tx.description || tx.zap?.content;
  const iconClassname = "w-16 h-12 relative flex items-center justify-center";
  const icon = (
    <div>
      {isCredit ? (
        author ? (
          <div className={iconClassname}>
            <User
              notClickable
              pubkey={author}
              classNames={{
                wrapper: "flex-col gap-0",
                avatar: "size-9",
                name: "text-xs font-light line-clamp-1",
              }}
            />
            <ArrowDownRight className="size-5 text-green-200 absolute -top-1.5 left-0" />
          </div>
        ) : (
          <div className={iconClassname}>
            <ArrowDownRight className="size-14 text-green-200" />
          </div>
        )
      ) : target ? (
        <div className={iconClassname}>
          <User
            notClickable
            pubkey={target}
            classNames={{
              wrapper: "flex-col gap-0",
              avatar: "size-9",
              name: "text-xs font-light line-clamp-1",
            }}
          />
          <ArrowUpRight className="size-5 text-destructive absolute -top-1.5 right-0" />
        </div>
      ) : (
        <div className={iconClassname}>
          <ArrowUpRight className="size-14 text-destructive" />
        </div>
      )}
    </div>
  );
  const component = (
    <div className="flex flex-row justify-around p-1 items-center hover:bg-accent rounded-sm">
      <div className="flex flex-row gap-3 items-center w-full">
        {icon}
        <div className="flex flex-col flex-1 items-start gap-0.5">
          {description && !tx.zap ? (
            <RichText
              tags={nutzap?.tags || tx.tags}
              className="text-md break-all text-start line-clamp-1"
              options={{
                inline: true,
                events: false,
                ecash: false,
                video: false,
                images: false,
                audio: false,
              }}
            >
              {description}
            </RichText>
          ) : tx.zap?.content.trim() ? (
            <RichText
              tags={tx.zap.tags}
              className="text-md break-all text-start line-clamp-1"
              options={{
                inline: true,
                events: false,
                ecash: false,
                video: false,
                images: false,
                audio: false,
              }}
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
              <span className="font-mono text-xs">
                {formatShortNumber(fee)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
  return e || a ? (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>{component}</DialogTrigger>
      <DialogContent className="bg-transparent border-none outline-none flex items-center justify-center h-[calc(100vh-2rem)]">
        {e ? (
          <Event
            id={e}
            pubkey={target}
            relays={groupRelay ? [groupRelay] : myRelays}
            showReactions={false}
          />
        ) : a ? (
          <A
            address={a}
            showReactions={false}
            relays={groupRelay ? [groupRelay] : myRelays}
          />
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
  function onWalletChange(id: string) {
    const w = wallets.find((w) => walletId(w) === id);
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
          <SelectItem key={walletId(w)} value={walletId(w)}>
            <WalletName wallet={w} />
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
  function onWalletChange(id: string) {
    const w = wallets.find((w) => walletId(w) === id);
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
        defaultValue={wallet ? walletId(wallet) : undefined}
        value={wallet ? walletId(wallet) : undefined}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("wallet.choose-wallet-placeholder")} />
        </SelectTrigger>
        <SelectContent>
          {wallets.map((w) => (
            <SelectItem key={walletId(w)} value={walletId(w)}>
              <WalletName wallet={w} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CashuWalletCoins({ wallet }: { wallet: NDKCashuWallet }) {
  const { t } = useTranslation();
  const [isSyncing, setIsSyncing] = useState(false);
  const proofs = wallet.state.getProofEntries({ onlyAvailable: true });

  async function syncProofs() {
    try {
      setIsSyncing(true);
      await wallet.checkProofs();
      toast.success(t("wallet.sync-success"));
      refreshWallet(wallet);
    } catch (err) {
      console.error(err);
      toast.success(t("wallet.sync-error"));
    } finally {
      setIsSyncing(false);
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col gap-2 pr-0.5 h-[68vh] overflow-y-scroll pretty-scrollbar">
        <div className="flex items-center justify-center">
          <Button
            disabled={isSyncing}
            variant="outline"
            size="tiny"
            onClick={syncProofs}
          >
            {isSyncing ? <RotateCw className="animate-spin" /> : <RefreshCw />}
            {t("wallet.sync")}
          </Button>
        </div>
        {proofs.map((info: ProofInfo) => (
          <Proof key={info.proof.C} info={info} />
        ))}
      </div>
    </div>
  );
}

function CashuWalletTransactions({
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
    <div className="flex flex-col gap-2 pr-0.5 h-[68vh] overflow-y-scroll pretty-scrollbar">
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
  );
}

interface WalletActionsProps {
  wallet: NDKWallet;
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
  wallet,
  onDeposit,
  isDepositing,
  canDeposit = true,
  onWithdraw,
  isWithdrawing,
  canWithdraw = true,
}: WalletActionsProps) {
  const { t } = useTranslation();
  const [pubkey, setPubkey] = useState("");
  const [lnAddress, setLnAddress] = useState("");
  const [lnurl, setLnurl] = useState("");
  const [invoice, setInvoice] = useState("");
  const canPay = pubkey || lnAddress || lnurl || invoice;

  function onPayOpenChange(open: boolean) {
    if (!open) {
      setPubkey("");
      setLnAddress("");
      setLnurl("");
      setInvoice("");
    }
  }

  async function onScan(content: string) {
    try {
      await analyzeTarget(content.trim(), {
        onPubkey: (pubkey) => {
          setPubkey(pubkey);
        },
        onLnAddress: (address) => {
          setLnAddress(address);
        },
        onLnurl: (url) => {
          setLnurl(url);
        },
        onInvoice: setInvoice,
      });
    } catch (err) {
      toast.error(t("qr.unknown"));
      console.error(err);
    }
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
      {canPay ? (
        <Dialog open={Boolean(canPay)} onOpenChange={onPayOpenChange}>
          <DialogContent>
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
            {pubkey ? (
              <SendToPubkey
                wallet={wallet}
                pubkey={pubkey}
                isWithdrawing={isWithdrawing}
                setIsWithdrawing={() => {}}
                onOpenChange={onPayOpenChange}
              />
            ) : lnAddress ? (
              <SendToLnAddress
                wallet={wallet}
                lnAddress={lnAddress}
                isWithdrawing={isWithdrawing}
                setIsWithdrawing={() => {}}
                onOpenChange={onPayOpenChange}
              />
            ) : lnurl ? (
              <SendToLnurl
                wallet={wallet}
                url={lnurl}
                isWithdrawing={isWithdrawing}
                setIsWithdrawing={() => {}}
                onOpenChange={onPayOpenChange}
              />
            ) : invoice ? (
              <PayInvoice
                wallet={wallet}
                invoice={invoice}
                isWithdrawing={isWithdrawing}
                setIsWithdrawing={() => {}}
                onOpenChange={onPayOpenChange}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
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

interface AnalyzeTargetCallbacks {
  onPubkey: (pubkey: string) => void;
  onLnAddress: (lnAddress: string) => void;
  onLnurl: (lnurl: string) => void;
  onInvoice: (invoice: string) => void;
  //onEcash?: (ecash: Token) => void;
  //onCashuRequest?: (request: CashuRequest) => void;
}

async function _analyzeTarget(
  content: string,
  callbacks: AnalyzeTargetCallbacks,
) {
  const { onPubkey, onLnAddress, onLnurl, onInvoice } = callbacks;
  const isNostrProfile =
    content.startsWith("nostr:npub") ||
    content.startsWith("npub") ||
    content.startsWith("nostr:nprofile") ||
    content.startsWith("profile");
  const lnurl = isLnurl(content);
  const lnAddress = isLightningAddress(content);
  const invoice = isLnInvoice(content);
  // todo: ecash
  // todo: cashu request
  if (isNostrProfile) {
    try {
      const decoded = nip19.decode(content.replace(/^nostr:/, ""));
      if (decoded?.type === "npub") {
        onPubkey(decoded.data);
      }
      if (decoded?.type === "nprofile") {
        onPubkey(decoded.data.pubkey);
      }
    } catch (err) {
      console.error(err);
    }
  } else if (lnurl) {
    try {
      onLnurl(content);
    } catch (err) {
      console.error(err);
    }
  } else if (lnAddress) {
    try {
      onLnAddress(content);
    } catch (err) {
      console.error(err);
    }
  } else if (invoice) {
    try {
      const decoded = decode(content);
      if (decoded) {
        onInvoice(content);
      }
    } catch (err) {
      console.error(err);
    }
  }
}
const analyzeTarget = debounce(_analyzeTarget, 200);

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
interface SendProps {
  wallet: NDKWallet;
  isWithdrawing: boolean;
  setIsWithdrawing: (isWithdrawing: boolean) => void;
  onOpenChange: (open: boolean) => void;
}

interface SendToPubkeyProps extends SendProps {
  pubkey: string;
}

function SendToPubkey({
  wallet,
  pubkey,
  isWithdrawing,
  setIsWithdrawing,
  onOpenChange,
}: SendToPubkeyProps) {
  const { t } = useTranslation();
  const { data: profile } = useProfile(pubkey);
  const { data: lnurl } = useLnurl(profile?.lud16);
  const [amount, setAmount] = useState("21");
  const [message, setMessage] = useState("");
  const isAmountValid = amount && Number(amount) > 0;

  async function payToPubkey() {
    try {
      setIsWithdrawing(true);
      if (!lnurl) {
        return;
      }
      const invoice = await fetchInvoice(lnurl, Number(amount), message);
      // @ts-expect-error: ree
      await wallet.lnPay({ pr: invoice });
      toast.success(
        t("wallet.withdraw.p2pk-success", {
          amount: amount,
          name: profile?.name || profile?.display_name || pubkey.slice(0, 8),
        }),
      );
      refreshWallet(wallet);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(t("wallet.withdraw.error"));
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <User
          pubkey={pubkey}
          classNames={{
            avatar: "size-6",
            name: "font-normal",
            wrapper: "gap-2",
          }}
        />
        {profile?.pubkey === pubkey && profile.lud16 ? (
          <div className="flex flex-row items-center gap-1.5">
            <ZapIcon className="size-3 text-muted-foreground" />
            <span className="font-mono text-xs">{profile.lud16}</span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <Label>{t("wallet.deposit.amount")}</Label>
        <AmountInput amount={amount} setAmount={setAmount} />
      </div>
      <div className="flex flex-col gap-0">
        <Label className="mx-2">{t("wallet.withdraw.message")}</Label>
        <AutocompleteTextarea
          disabled={lnurl?.commentAllowed === 0}
          className="rounded-sm shadow-none text-sm"
          message={message}
          placeholder={t("wallet.withdraw.message-placeholder")}
          setMessage={setMessage}
          minRows={3}
          maxRows={6}
          submitOnEnter={false}
        />
      </div>
      <div className="mx-2 flex flex-row items-center gap-2">
        <Button
          disabled={isWithdrawing || !lnurl || !isAmountValid}
          onClick={payToPubkey}
          className="w-full flex-1"
          variant="outline"
        >
          {isWithdrawing ? <RotateCw className="animate-spin" /> : <Coins />}
          {t("wallet.withdraw.confirm")}
          <User
            pubkey={pubkey}
            notClickable
            classNames={{
              wrapper: "gap-1",
              avatar: "size-4",
              name: "text-xs",
            }}
          />
        </Button>
      </div>
    </div>
  );
}

interface SendToLnAddressProps extends SendProps {
  lnAddress: string;
}

function SendToLnAddress({
  wallet,
  lnAddress,
  isWithdrawing,
  setIsWithdrawing,
  onOpenChange,
}: SendToLnAddressProps) {
  const { t } = useTranslation();
  const { data: lnurl } = useLnurl(lnAddress);
  const [amount, setAmount] = useState("21");
  const [message, setMessage] = useState("");
  const isAmountValid = amount && Number(amount) > 0;

  async function payToLnAddress() {
    try {
      setIsWithdrawing(true);
      if (!lnurl) {
        return;
      }
      const invoice = await fetchInvoice(lnurl, Number(amount), message);
      // @ts-expect-error: ree
      await wallet.lnPay({ pr: invoice });
      toast.success(
        t("wallet.withdraw.lud16-success", {
          amount: amount,
          lud16: lnAddress,
        }),
      );
      refreshWallet(wallet);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(t("wallet.withdraw.error"));
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center gap-1.5">
        <ZapIcon className="size-3 text-muted-foreground" />
        <span className="font-mono text-sm">{lnAddress}</span>
      </div>
      <div className="flex flex-col gap-1">
        <Label>{t("wallet.deposit.amount")}</Label>
        <AmountInput amount={amount} setAmount={setAmount} />
      </div>
      <div className="flex flex-col gap-0">
        <Label className="mx-2">{t("wallet.withdraw.message")}</Label>
        <AutocompleteTextarea
          disabled={lnurl?.commentAllowed === 0}
          className="rounded-sm shadow-none text-sm"
          message={message}
          placeholder={t("wallet.withdraw.message-placeholder")}
          setMessage={setMessage}
          minRows={3}
          maxRows={6}
          submitOnEnter={false}
        />
      </div>
      <div className="mx-2 flex flex-row items-center gap-2">
        <Button
          disabled={isWithdrawing || !lnurl || !isAmountValid}
          onClick={payToLnAddress}
          className="w-full flex-1"
          variant="outline"
        >
          {isWithdrawing ? <RotateCw className="animate-spin" /> : <ZapIcon />}
          {t("wallet.withdraw.confirm")}
        </Button>
      </div>
    </div>
  );
}

interface SendToLnurlProps extends SendProps {
  url: string;
}

function SendToLnurl({
  wallet,
  url,
  isWithdrawing,
  setIsWithdrawing,
  onOpenChange,
}: SendToLnurlProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("21");
  const [message, setMessage] = useState("");
  const isAmountValid = amount && Number(amount) > 0;
  const { data: lnurl } = useLnurl(url);

  async function payToLnurl() {
    try {
      setIsWithdrawing(true);
      if (!lnurl) {
        return;
      }
      const invoice = await fetchInvoice(lnurl, Number(amount), message);
      // @ts-expect-error: ree
      await wallet.lnPay({ pr: invoice });
      toast.success(
        t("wallet.withdraw.amount-success", {
          amount: amount,
        }),
      );
      refreshWallet(wallet);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(t("wallet.withdraw.error"));
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center gap-1.5">
        <ZapIcon className="size-3 text-muted-foreground" />
        <span className="font-mono line-clamp-1 text-sm">{lnurl}</span>
      </div>
      <div className="flex flex-col gap-1">
        <Label>{t("wallet.deposit.amount")}</Label>
        <AmountInput amount={amount} setAmount={setAmount} />
      </div>
      <div className="flex flex-col gap-0">
        <Label className="mx-2">{t("wallet.withdraw.message")}</Label>
        <AutocompleteTextarea
          disabled={lnurl?.commentAllowed === 0}
          className="rounded-sm shadow-none text-sm"
          message={message}
          placeholder={t("wallet.withdraw.message-placeholder")}
          setMessage={setMessage}
          minRows={3}
          maxRows={6}
          submitOnEnter={false}
        />
      </div>
      <div className="mx-2 flex flex-row items-center gap-2">
        <Button
          disabled={isWithdrawing || !lnurl || !isAmountValid}
          onClick={payToLnurl}
          className="w-full flex-1"
          variant="outline"
        >
          {isWithdrawing ? <RotateCw className="animate-spin" /> : <ZapIcon />}
          {t("wallet.withdraw.confirm")}
        </Button>
      </div>
    </div>
  );
}

interface PayInvoiceProps extends SendProps {
  invoice: string;
}

function PayInvoice({
  wallet,
  invoice,
  isWithdrawing,
  setIsWithdrawing,
  onOpenChange,
}: PayInvoiceProps) {
  const { t } = useTranslation();

  async function payInvoice() {
    try {
      setIsWithdrawing(true);
      // @ts-expect-error: ree
      await wallet.lnPay({ pr: invoice });
      refreshWallet(wallet);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(t("wallet.withdraw.error"));
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <Invoice
      invoice={invoice}
      showSummary
      onConfirm={payInvoice}
      canPay={!isWithdrawing}
    />
  );
}

function SendToWallet({
  wallet,
  isWithdrawing,
  setIsWithdrawing,
  onOpenChange,
}: SendProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("21");
  const [ndkWallets] = useNDKWallets();
  const otherWallets = ndkWallets.filter(
    (w) => walletId(w) !== walletId(wallet),
  );
  const [toWallet, setToWallet] = useState<NDKWallet | null>(null);
  const isAmountValid = amount && Number(amount) > 0;

  async function onWithdrawToWallet() {
    if (!toWallet) {
      toast.error(t("wallet.withdraw.no-wallet"));
      return;
    }
    try {
      setIsWithdrawing(true);
      // todo: out tx if cashu
      if (toWallet instanceof NDKNWCWallet) {
        const result = await toWallet.makeInvoice(Number(amount) * 1000, "");
        // @ts-expect-error: incorrect return type
        await wallet.lnPay({ pr: result.invoice });
        toast.success(t("wallet.withdraw.success"));
      } else if (toWallet instanceof NDKWebLNWallet) {
        const result = await toWallet.provider?.makeInvoice({
          amount: Number(amount),
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
      onOpenChange(false);
    } catch (err) {
      toast.error(t("wallet.withdraw.error"));
      console.error(err);
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label>{t("wallet.deposit.amount")}</Label>
        <AmountInput amount={amount} setAmount={setAmount} />
      </div>
      <CustomWalletSelector
        placeholder={t("wallet.withdraw.to-wallet")}
        wallets={otherWallets}
        onWalletSelected={(w) => {
          setToWallet(w);
        }}
      />
      <Button
        disabled={isWithdrawing || !isAmountValid || !toWallet}
        onClick={onWithdrawToWallet}
        className="w-full flex-1"
        variant="outline"
      >
        {isWithdrawing ? <RotateCw className="animate-spin" /> : <WalletIcon />}
        {t("wallet.withdraw.confirm")}
        {toWallet ? <WalletName wallet={toWallet} /> : null}
      </Button>
    </div>
  );
}

interface SendEcashProps extends Omit<SendProps, "wallet"> {
  wallet: NDKCashuWallet;
}

function SendEcash({
  wallet,
  isWithdrawing,
  setIsWithdrawing,
}: SendEcashProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [ecash, setEcash] = useState<Token | null>(null);
  const [token, setToken] = useState<string>("");
  const [mint, setMint] = useState<string | undefined>(
    wallet instanceof NDKCashuWallet ? wallet.mints[0] : undefined,
  );
  const balances = wallet.mintBalances;
  const mintBalance = balances[mint ?? ""];
  const [amount, setAmount] = useState("21");
  const isAmountValid =
    amount && Number(amount) > 0 && Number(amount) <= mintBalance;

  async function onWithdrawCash() {
    try {
      setIsWithdrawing(true);
      if (!mint) throw new Error("No mint selected");

      const ecash = await mintEcash(wallet, mint, Number(amount), message);
      if (!ecash) throw new Error("Failed to mint ecash");
      const token = getEncodedToken(ecash);
      setToken(token);
      setEcash(ecash);
    } catch (err) {
      console.error(err);
      toast.error(t("wallet.ecash.mint-error", { mint }));
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {ecash && token ? (
        <EcashToken token={token} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>{t("wallet.deposit.amount")}</Label>
            <AmountInput
              amount={amount}
              max={mintBalance}
              setAmount={setAmount}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>{t("wallet.ecash.message")}</Label>
            <AutocompleteTextarea
              message={message}
              setMessage={setMessage}
              placeholder={t("wallet.ecash.message-placeholder")}
              minRows={3}
              maxRows={6}
              submitOnEnter={false}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>{t("wallet.deposit.mint")}</Label>
            <Select value={mint} onValueChange={setMint}>
              <SelectTrigger>
                <SelectValue placeholder={t("wallet.deposit.mint")} />
              </SelectTrigger>
              <SelectContent>
                {wallet.mints.map((m) => (
                  <SelectItem key={m} value={m}>
                    <div className="flex flex-row items-center gap-2 justify-between">
                      <div className="flex flex-row items-center gap-4">
                        <MintLink url={m} notClickable />
                        <Balance amount={balances[m] ?? 0} unit="sat" />
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={isWithdrawing || !isAmountValid || !mint}
            onClick={onWithdrawCash}
            className="w-full flex-1"
            variant="outline"
          >
            {isWithdrawing ? (
              <RotateCw className="animate-spin" />
            ) : (
              <Banknote />
            )}
            {t("wallet.withdraw.confirm-cash")}
          </Button>
        </div>
      )}
    </div>
  );
}

function Withdraw({
  wallet,
  open,
  onOpenChange,
}: {
  wallet: NDKWallet;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [lnAddress, setLnAddress] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [toWallet, setToWallet] = useState(false);
  const [sendEcash, setSendEcash] = useState(false);
  const [target, setTarget] = useState("");
  const [invoice, setInvoice] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [lnurl, setLnurl] = useState<string | null>(null);

  function onClose(open?: boolean) {
    if (!open) {
      setToWallet(false);
      setSendEcash(false);
      setInvoice("");
      setTarget("");
      setPubkey("");
      setLnAddress("");
    }
    onOpenChange?.(Boolean(open));
  }

  function onTargetChange(newTarget: string) {
    const content = newTarget.trim();
    setTarget(content);
    try {
      analyzeTarget(content, {
        onPubkey: (pubkey) => {
          setPubkey(pubkey);
        },
        onLnAddress: (address) => {
          setLnAddress(address);
        },
        onLnurl: (url) => {
          setLnurl(url);
        },
        onInvoice: setInvoice,
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-96">
        <DialogHeader>
          <DialogTitle>
            <div className="flex flex-row items-center gap-1">
              {sendEcash ? t("wallet.ecash.title") : t("wallet.withdraw.title")}{" "}
              <ArrowUpRight className="text-muted-foreground" />
            </div>
          </DialogTitle>
          <DialogDescription>
            {sendEcash
              ? t("wallet.ecash.description")
              : t("wallet.withdraw.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {sendEcash ? (
            <SendEcash
              wallet={wallet as NDKCashuWallet}
              isWithdrawing={isWithdrawing}
              setIsWithdrawing={setIsWithdrawing}
              onOpenChange={onClose}
            />
          ) : toWallet ? (
            <SendToWallet
              wallet={wallet}
              isWithdrawing={isWithdrawing}
              setIsWithdrawing={setIsWithdrawing}
              onOpenChange={onClose}
            />
          ) : pubkey ? (
            <SendToPubkey
              wallet={wallet}
              pubkey={pubkey}
              isWithdrawing={isWithdrawing}
              setIsWithdrawing={setIsWithdrawing}
              onOpenChange={onClose}
            />
          ) : lnAddress ? (
            <SendToLnAddress
              wallet={wallet}
              lnAddress={lnAddress}
              isWithdrawing={isWithdrawing}
              setIsWithdrawing={setIsWithdrawing}
              onOpenChange={onClose}
            />
          ) : lnurl ? (
            <SendToLnurl
              wallet={wallet}
              url={lnurl}
              isWithdrawing={isWithdrawing}
              setIsWithdrawing={setIsWithdrawing}
              onOpenChange={onClose}
            />
          ) : invoice ? (
            <PayInvoice
              wallet={wallet}
              invoice={invoice}
              isWithdrawing={isWithdrawing}
              setIsWithdrawing={setIsWithdrawing}
              onOpenChange={onClose}
            />
          ) : (
            <>
              <div className="flex flex-col gap-0">
                <Label className="mx-2">{t("wallet.withdraw.to")}</Label>
                <AutocompleteTextarea
                  className="rounded-sm shadow-none text-sm py-2 px-3"
                  message={target}
                  setMessage={onTargetChange}
                  placeholder={t("wallet.withdraw.placeholder")}
                  minRows={1}
                  maxRows={2}
                  submitOnEnter={false}
                  disableEmojiAutocomplete
                />
              </div>
              {!pubkey && !lnAddress && !invoice ? (
                <>
                  <p className="mx-auto text-xs text-muted-foreground">
                    {t("user.login.or")}
                  </p>
                  <div className="flex flex-row items-center gap-2">
                    <Button
                      disabled={isWithdrawing}
                      onClick={() => setToWallet(true)}
                      className="w-full"
                      variant="outline"
                    >
                      <WalletIcon />
                      {t("wallet.withdraw.choose-wallet")}
                    </Button>
                    {wallet instanceof NDKCashuWallet && (
                      <Button
                        disabled={isWithdrawing}
                        onClick={() => setSendEcash(true)}
                        className="w-full"
                        variant="outline"
                      >
                        <Banknote />
                        {t("wallet.withdraw.confirm-cash")}
                      </Button>
                    )}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AmountInput({
  amount,
  setAmount,
  max,
}: {
  amount: string;
  setAmount: (amount: string) => void;
  max?: number;
}) {
  return (
    <div className="flex flex-row gap-4 items-center mx-2">
      <Bitcoin className="size-14 text-muted-foreground" />
      <Input
        max={max}
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
  const [invoice, setInvoice] = useState<string | null>(null);
  const [amount, setAmount] = useState("21");
  const [mint, setMint] = useState<string | undefined>(
    wallet instanceof NDKCashuWallet ? wallet.mints[0] : undefined,
  );
  const deposit = useDeposit(wallet);
  const { t } = useTranslation();
  const [ndkWallets] = useNDKWallets();
  const otherWallets = ndkWallets.filter(
    (w) => walletId(w) !== walletId(wallet),
  );
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
      if (pr) {
        setInvoice(pr);
      } else {
        toast.error(t("wallet.deposit.error"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDepositing(false);
    }
  }

  async function onRedeem() {
    try {
      if (!ecash || !token || !(wallet instanceof NDKCashuWallet)) return;
      setIsDepositing(true);
      await wallet.receiveToken(token);
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
      console.error(err);
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
            <p className="mx-auto text-xs text-muted-foreground">
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
                <p className="mx-auto text-xs text-muted-foreground">
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
                  {ecash && !wallet.mints.includes(ecash.mint) ? (
                    <span className="text-xs text-red-300">
                      {t("wallet.deposit.mint-error")}
                    </span>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  disabled={
                    isDepositing || !ecash || !wallet.mints.includes(ecash.mint)
                  }
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

function CashuWallet({ wallet }: { wallet: NDKCashuWallet }) {
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
          wallet={wallet}
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
            <CashuWalletTransactions wallet={wallet} pubkey={pubkey} />
          </TabsContent>
          <TabsContent value="coins">
            <CashuWalletCoins wallet={wallet} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}

//function WebLNWalletTransactions({ wallet }: { wallet: NDKWebLNWallet }) {
//	// todo: webln provider does not support this
//	const { data: transactions, isLoading, isError } = useWebLNTransactions(wallet);
//	return null;
//}

function WebLNWallet({ wallet }: { wallet: NDKWebLNWallet }) {
  const { data: balance } = useWebLNBalance(wallet);
  const { data: info } = useWebLNInfo(wallet);

  const canDeposit = info?.methods.includes("makeInvoice");
  const canWithdraw = info?.methods.includes("sendPayment");
  //const canListTransactions = info?.methods.includes("getTransactions");

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

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
          wallet={wallet}
          onDeposit={onDeposit}
          canDeposit={canDeposit}
          isDepositing={showDeposit}
          onWithdraw={onWithdraw}
          canWithdraw={canWithdraw}
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
    </div>
  );
}

function NWCWalletTransactions({ wallet }: { wallet: NDKNWCWallet }) {
  const { data: transactions, isLoading, isError } = useNWCTransactions(wallet);
  const { t } = useTranslation();

  return (
    <>
      {isLoading || isError ? (
        <div className="flex items-center justify-center w-full h-[73vh]">
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
        <div className="flex flex-col gap-2 pr-0.5 h-[73vh] overflow-y-scroll pretty-scrollbar">
          {transactions?.map((tx) => <Tx key={tx.id} tx={tx} />)}
        </div>
      )}
    </>
  );
}

function NWCWallet({ wallet }: { wallet: NDKNWCWallet }) {
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
          wallet={wallet}
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
    return <CashuWallet wallet={wallet} />;
  } else if (wallet instanceof NDKWebLNWallet) {
    return <WebLNWallet wallet={wallet} />;
  } else if (wallet instanceof NDKNWCWallet) {
    return <NWCWallet wallet={wallet} />;
  } else {
    return (
      <span className="text-xs text-muted-foreground">
        {t("wallet.not-found")}
      </span>
    );
  }
}

export function ChachiWallet() {
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

function WebLNWalletBalance({
  wallet,
  short,
}: {
  wallet: NDKWebLNWallet;
  short?: boolean;
}) {
  const { data: balance } = useWebLNBalance(wallet);
  const { data: info } = useWebLNInfo(wallet);
  return (
    <div className="flex flex-row gap-10 w-full items-center justify-between">
      <div className="flex flex-row gap-2 items-center">
        <Puzzle className="size-4 text-muted-foreground" />
        <span className="line-clamp-1">
          {info?.node?.alias ? info.node.alias : "WebLN"}
        </span>
      </div>
      <Balance short={short} amount={balance} unit="sat" />
    </div>
  );
}

function NWCWalletName({ wallet }: { wallet: NDKNWCWallet }) {
  const name = walletId(wallet);
  return wallet.walletService ? (
    <User
      notClickable
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
  short,
}: {
  wallet: NDKNWCWallet;
  classNames?: BalanceClassnames;
  short?: boolean;
}) {
  const { data: amount } = useNWCBalance(wallet);
  return <Balance short={short} amount={amount} classNames={classNames} />;
}

function NWCWalletBalance({
  wallet,
  short,
}: {
  wallet: NDKNWCWallet;
  short?: boolean;
}) {
  return (
    <div className="flex flex-row gap-6 w-full items-center justify-between">
      <div className="flex flex-row gap-2 items-center">
        <PlugZap className="size-4 text-muted-foreground" />
        <NWCWalletName wallet={wallet} />
      </div>
      <NWCWalletBalanceAmount wallet={wallet} short={short} />
    </div>
  );
}

export function CashuWalletBalanceAmount({
  wallet,
  classNames,
  short,
}: {
  wallet: NDKCashuWallet;
  classNames?: BalanceClassnames;
  short?: boolean;
}) {
  const balance = useCashuBalance(wallet);
  return (
    <Balance
      key={balance}
      short={short}
      amount={balance}
      unit="sat"
      classNames={classNames}
    />
  );
}

export function WebLNWalletBalanceAmount({
  wallet,
  classNames,
  short,
}: {
  wallet: NDKWebLNWallet;
  classNames?: BalanceClassnames;
  short?: boolean;
}) {
  const { data: balance } = useWebLNBalance(wallet);
  return (
    <Balance
      short={short}
      amount={balance}
      unit="sat"
      classNames={classNames}
    />
  );
}

function CashuWalletName({ wallet }: { wallet: NDKCashuWallet }) {
  return wallet.event ? (
    <User
      notClickable
      pubkey={wallet.event.pubkey}
      classNames={{
        wrapper: "gap-1.5",
        avatar: "size-4",
        name: "font-normal",
      }}
    />
  ) : null;
}

function CashuWalletBalance({
  wallet,
  short,
}: {
  wallet: NDKCashuWallet;
  short?: boolean;
}) {
  const balance = useCashuBalance(wallet);
  return (
    <div className="flex flex-row gap-10 w-full items-center justify-between">
      <div className="flex flex-row gap-2 items-center">
        <WalletIcon className="size-4 text-muted-foreground" />
        <CashuWalletName wallet={wallet} />
      </div>
      <Balance short={short} amount={balance} unit="sat" />
    </div>
  );
}

export function WalletBalance({
  wallet,
  short,
}: {
  wallet: NDKWallet;
  short?: boolean;
}) {
  if (wallet instanceof NDKCashuWallet) {
    return <CashuWalletBalance wallet={wallet} short={short} />;
  } else if (wallet instanceof NDKWebLNWallet) {
    return <WebLNWalletBalance wallet={wallet} short={short} />;
  } else if (wallet instanceof NDKNWCWallet) {
    return <NWCWalletBalance wallet={wallet} short={short} />;
  } else {
    return null;
  }
}

function WebLNWalletName({ wallet }: { wallet: NDKWebLNWallet }) {
  const { data: info } = useWebLNInfo(wallet);
  return (
    <span className="line-clamp-1">
      {info?.node?.alias ? info.node.alias : "WebLN"}
    </span>
  );
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
