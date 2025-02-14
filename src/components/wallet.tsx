import { useState, useMemo } from "react";
import { InputCopy } from "@/components/ui/input-copy";
import {
  Wallet as WalletIcon,
  PlugZap,
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
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  ScanQrCode,
  CircleSlash2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  NDKWallet,
  NDKCashuWallet,
  NDKWebLNWallet,
  NDKNWCWallet,
} from "@nostr-dev-kit/ndk-wallet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Event } from "@/components/nostr/event";
import { Label } from "@/components/ui/label";
import { Invoice } from "@/components/ln";
import { Zap, validateZapRequest } from "@/lib/nip-57";
import { useNDK, useNWCNDK } from "@/lib/ndk";
import { useRelays } from "@/lib/nostr";
import { formatShortNumber } from "@/lib/number";
import { useHost } from "@/lib/hooks";
import {
  defaultMints,
  useWallet,
  useDeposit,
  useCreateWallet,
  useTransactions,
  useDefaultWallet,
  useWallets,
  useNWCBalance,
  useNWCInfo,
  useNWCTransactions,
  Transaction,
  Unit,
  Direction,
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
import { MintIcon, MintName } from "@/components/mint";
import { RelayIcon, RelayName } from "@/components/nostr/relay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [, setDefaultWallet] = useDefaultWallet();
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
      setDefaultWallet({ type: "nip60" });
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

export function ConnectWallet() {
  const { t } = useTranslation();
  const ndk = useNDK();
  const nwcNdk = useNWCNDK();
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingWebln, setIsLoadingWebln] = useState(false);
  const [connectString, setConnectString] = useState("");
  const [, setDefaultWallet] = useDefaultWallet();
  const [, setWallets] = useWallets();
  const isValidNwcString = connectString.startsWith("nostr+walletconnect://");

  function connectWebln() {
    if (!isLoadingWebln) {
      toast.error(t("wallet.dialog.webln-unavailable"));
      return;
    }
    try {
      setIsLoadingWebln(true);
      const wallet = new NDKWebLNWallet();
      ndk.wallet = wallet;
      // todo: set as active wallet
      setDefaultWallet({ type: "webln" });
      setWallets((ws) => [{ type: "webln" }, ...ws]);
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
        nwc.on("ready", () => {
          setDefaultWallet({ type: "nwc", connection: connectString });
          setWallets((ws) => [
            { type: "nwc", connection: connectString },
            ...ws,
          ]);
          ndk.wallet = nwc;
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
  const [isOpen, setIsOpen] = useState(false);
  const isCredit = tx.direction === "in";
  const amount = tx.unit === "msat" ? tx.amount / 1000 : tx.amount;
  const fee = tx.fee;
  // fixme: p is target, pubkey is author
  const p = tx.p || tx.zap?.pubkey || tx.zap?.p;
  const e = tx.e || tx.zap?.e;
  const component = (
    <div className="flex flex-row justify-between p-1 items-center hover:bg-accent rounded-sm">
      <div className="flex flex-row gap-2 items-center">
        {isCredit ? (
          p ? (
            <div className="size-16 relative place-content-center">
              <User
                pubkey={p}
                classNames={{
                  wrapper: "flex-col gap-0",
                  avatar: "size-10",
                  name: "text-xs font-light text-muted-foreground line-clamp-1",
                }}
              />
              <ArrowDownRight className="size-5 text-green-200 absolute top-0 left-0" />
            </div>
          ) : tx.mint ? (
            <div className="size-16 relative place-content-center">
              <MintIcon url={tx.mint} className="size-10" />
              <ArrowDownRight className="size-5 text-green-200 absolute top-0 left-0" />
            </div>
          ) : (
            <div className="size-16 relative">
              <ArrowDownRight className="size-14 text-green-200" />
            </div>
          )
        ) : p ? (
          <div className="size-16 relative place-content-center">
            <User
              pubkey={p}
              classNames={{
                wrapper: "flex-col gap-0",
                avatar: "size-10",
                name: "text-xs font-light text-muted-foreground line-clamp-1",
              }}
            />
            <ArrowUpRight className="size-5 text-destructive absolute -top-1.5 right-0" />
          </div>
        ) : (
          <div className="size-16 relative place-content-center">
            <ArrowUpRight className="size-14 text-destructive" />
          </div>
        )}
        <div className="flex flex-col items-start gap-0.5">
          {tx.description && !tx.zap ? (
            <span className="text-md line-clamp-1">{tx.description}</span>
          ) : tx.zap?.content ? (
            <span className="text-md line-clamp-1">{tx.zap.content}</span>
          ) : (
            <div className="flex flex-col gap-0 items-start">
              <span className="text-md text-muted-foreground">
                {isCredit ? t("wallet.credit") : t("wallet.debit")}
              </span>
            </div>
          )}
          {tx.mint ? (
            <div className="flex flex-row items-center gap-1">
              <Landmark className="size-3 text-muted-foreground" />
              <div className="flex flex-row items-center gap-0.5">
                <MintIcon url={tx.mint} className="size-3" />
                <span className="text-xs text-muted-foreground line-clamp-1">
                  <MintName url={tx.mint} />
                </span>
              </div>
            </div>
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
            <Coins className="size-6 text-muted-foreground" />
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
              <Coins className="size-3 text-muted-foreground" />
            )}
            <span className="font-mono text-xs">{formatShortNumber(fee)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
  return e ? (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>{component}</DialogTrigger>
      <DialogContent className="bg-transparent border-none">
        <Event id={e} relays={[]} pubkey={tx.p} showReactions={false} />
      </DialogContent>
    </Dialog>
  ) : (
    component
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
    <ScrollArea className="h-80">
      <div className="flex flex-col gap-2 pr-3">
        {sorted.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
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
  scanQrCode: () => void;
}

function WalletActions({
  onDeposit,
  isDepositing,
  canDeposit = true,
  onWithdraw,
  isWithdrawing,
  canWithdraw = true,
  scanQrCode,
}: WalletActionsProps) {
  const { t } = useTranslation();
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
      <Button variant="outline" size="bigIcon" onClick={scanQrCode}>
        <ScanQrCode />
      </Button>
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

function RelayList({ relays }: { relays: string[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row gap-1 items-center">
        <Server className="size-4 text-muted-foreground" />
        <h4 className="text-sm text-muted-foreground uppercase font-light">
          {t("wallet.relays")}
        </h4>
      </div>
      <ul>
        {relays.map((r) => (
          <li key={r} className="flex flex-row items-center gap-1.5">
            <RelayIcon relay={r} className="size-5" />
            <span className="text-sm font-mono">
              <RelayName relay={r} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CashuWithdraw({
  wallet,
  open,
  onOpenChange,
}: {
  wallet: NDKCashuWallet;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [invoice, setInvoice] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { t } = useTranslation();

  async function onWithdraw() {
    // todo: ln address, cashu payment request
    try {
      setIsWithdrawing(true);
      if (invoice) {
        const result = await wallet.lnPay({ pr: invoice });
        if (result?.preimage) {
          toast.success(t("wallet.withdraw.success"));
        }
      }
    } catch (err) {
      toast.error(t("wallet.withdraw.error"));
    } finally {
      setIsWithdrawing(false);
      setInvoice("");
      onOpenChange?.(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-96">
        <DialogHeader>
          <DialogTitle>{t("wallet.withdraw.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <Label>{t("wallet.withdraw.to")}</Label>
            <Input
              type="text"
              className="w-full"
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              rightIcon={<ScanQrCode />}
              onRightIconClick={() => console.log("scan qr code")}
            />
            <span className="text-xs text-muted-foreground">
              {t("wallet.withdraw.to-description")}
            </span>
          </div>
          <Button disabled={isWithdrawing || !invoice} onClick={onWithdraw}>
            {t("wallet.withdraw.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CashuDeposit({
  wallet,
  open,
  onOpenChange,
}: {
  wallet: NDKCashuWallet;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [isDepositing, setIsDepositing] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [amount, setAmount] = useState("21");
  const [mint, setMint] = useState(wallet.mints[0]);
  const deposit = useDeposit();
  const { t } = useTranslation();

  async function onDeposit() {
    try {
      setIsDepositing(true);
      const pr = await deposit(
        Number(amount),
        mint,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-96">
        <DialogHeader>
          <DialogTitle>{t("wallet.deposit.title")}</DialogTitle>
        </DialogHeader>
        {invoice ? (
          <Invoice invoice={invoice} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label>{t("wallet.deposit.amount")}</Label>
              <div className="flex flex-row gap-4 items-center mx-2">
                <Bitcoin className="size-14 text-muted-foreground" />
                <Input
                  type="number"
                  className="w-full text-center font-mono text-6xl h-15"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
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
                      <MintName url={m} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={isDepositing} onClick={onDeposit}>
              {t("wallet.deposit.confirm")}
            </Button>
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
  const balances = wallet?.mintBalances || {};
  const balance = Object.values(balances).reduce((acc, b) => acc + b, 0);

  async function onDeposit() {
    setShowDeposit(true);
  }

  async function onWithdraw() {
    setShowWithdraw(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {wallet ? (
        <>
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
              scanQrCode={() => {}}
            />
          </div>
          <CashuDeposit
            wallet={wallet}
            open={showDeposit}
            onOpenChange={setShowDeposit}
          />
          <CashuWithdraw
            wallet={wallet}
            open={showWithdraw}
            onOpenChange={setShowWithdraw}
          />
          {pubkey ? (
            <WalletTransactions wallet={wallet} pubkey={pubkey} />
          ) : null}
          <div className="flex flex-col gap-1">
            <div className="flex flex-row gap-1 items-center">
              <Landmark className="size-4 text-muted-foreground" />
              <h4 className="text-sm text-muted-foreground uppercase font-light">
                {t("wallet.mints")}
              </h4>
            </div>
            <ul>
              {wallet.mints.map((m) => (
                <li key={m} className="flex flex-row items-center gap-1.5">
                  <MintIcon url={m} className="size-5" />
                  <span className="text-sm font-mono">
                    <MintName url={m} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {wallet.relaySet ? (
            <RelayList relays={wallet.relaySet.relayUrls} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function WebLNWalletSettings({ wallet }: { wallet: NDKWebLNWallet }) {
  return <>{wallet.walletId}</>;
}

function tryParseZap(raw: string, invoice: string): Zap | null {
  try {
    return validateZapRequest(raw, invoice);
  } catch (err) {
    return null;
  }
}

//function NWCDeposit({
//  wallet,
//  open,
//  onOpenChange,
//}: {
//  wallet: NDKNWCWallet;
//
//  open?: boolean;
//  onOpenChange?: (open: boolean) => void;
//}) {
//  const [isDepositing, setIsDepositing] = useState(false);
//  const [invoice, setInvoice] = useState(null);
//  const [amount, setAmount] = useState("21");
//  const [mint, setMint] = useState(wallet.mints[0]);
//  const deposit = useDeposit();
//  const { t } = useTranslation();
//
//  async function onDeposit() {
//    try {
//      setIsDepositing(true);
//      // todo: make_invoice
//      setInvoice(pr);
//    } catch (err) {
//      console.error(err);
//    } finally {
//      setIsDepositing(false);
//    }
//  }
//
//  return (
//    <Dialog open={open} onOpenChange={onOpenChange}>
//      <DialogContent className="w-96">
//        <DialogHeader>
//          <DialogTitle>{t("wallet.deposit.title")}</DialogTitle>
//        </DialogHeader>
//        {invoice ? (
//          <Invoice invoice={invoice} />
//        ) : (
//          <div className="flex flex-col gap-4">
//            <div className="flex flex-col gap-1">
//              <Label>{t("wallet.deposit.amount")}</Label>
//              <div className="flex flex-row gap-4 items-center mx-2">
//                <Bitcoin className="size-14 text-muted-foreground" />
//                <Input
//                  type="number"
//                  className="w-full text-center font-mono text-6xl h-15"
//                  value={amount}
//                  onChange={(e) => setAmount(e.target.value)}
//                />
//              </div>
//            </div>
//            <div className="flex flex-col gap-1">
//              <Label>{t("wallet.deposit.mint")}</Label>
//              <Select
//                disabled={isDepositing || wallet.mints.length < 2}
//                onValueChange={setMint}
//                defaultValue={mint}
//              >
//                <SelectTrigger className="w-full">
//                  <SelectValue placeholder="Choose mint" />
//                </SelectTrigger>
//                <SelectContent>
//                  {wallet.mints.map((m) => (
//                    <SelectItem key={m} value={m}>
//                      <MintName url={m} />
//                    </SelectItem>
//                  ))}
//                </SelectContent>
//              </Select>
//            </div>
//            <Button disabled={isDepositing} onClick={onDeposit}>
//              {t("wallet.deposit.confirm")}
//            </Button>
//          </div>
//        )}
//      </DialogContent>
//    </Dialog>
//  );
//}

function NWCWalletTransactions({ wallet }: { wallet: NDKNWCWallet }) {
  const { data: txs, isLoading, isError } = useNWCTransactions(wallet);
  const { t } = useTranslation();

  const transactions = useMemo(() => {
    if (!txs) return [];

    const asTxs = txs.map((nwcTx) => {
      return {
        id: nwcTx.preimage || nwcTx.invoice,
        created_at: nwcTx.created_at,
        amount: nwcTx.amount / 1000,
        fee: nwcTx.fees_paid ? nwcTx.fees_paid / 1000 : 0,
        unit: "sat" as Unit,
        invoice: nwcTx.invoice,
        direction: nwcTx.type === "incoming" ? "in" : ("out" as Direction),
        description: nwcTx.description,
        zap: nwcTx.description
          ? tryParseZap(nwcTx.description, nwcTx.invoice)
          : null,
      };
    });
    asTxs.sort((a, b) => b.created_at - a.created_at);
    return asTxs;
  }, [txs]);
  console.log(
    "TXS",
    transactions.filter((t) => t.zap),
  );

  return (
    <>
      {isLoading || isError ? (
        <div className="flex items-center justify-center w-full h-80">
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
        <ScrollArea className="h-80">
          <div className="flex flex-col gap-2 pr-2.5">
            {transactions.map((tx) => (
              <Tx key={tx.id} tx={tx} />
            ))}
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
    console.log("DEPOSIT");
  }

  function onWithdraw() {
    setIsWithdrawing(true);
    console.log("WITHDRAW");
  }

  function scanQrCode() {
    console.log("Scan");
  }

  return (
    <div className="flex flex-col gap-2">
      {wallet.walletService ? (
        <User
          pubkey={wallet.walletService.pubkey}
          classNames={{ avatar: "size-6", wrapper: "gap-1" }}
        />
      ) : null}
      <div className="w-full flex items-center justify-center">
        <div className="flex flex-row gap-0 items-center">
          <Bitcoin className="size-12 text-muted-foreground" />
          <span className="text-6xl font-mono">
            {typeof amount === "number" ? amount : "-"}
          </span>
        </div>
      </div>
      {wallet.pairingCode ? (
        <div className="flex flex-row gap-1 items-center">
          <PlugZap className="text-muted-foreground size-6" />
          <InputCopy isSecret value={wallet.pairingCode} />
        </div>
      ) : null}
      <WalletActions
        onDeposit={onDeposit}
        isDepositing={isDepositing}
        canDeposit={isDepositSupported}
        onWithdraw={onWithdraw}
        isWithdrawing={isWithdrawing}
        canWithdraw={isWithdrawalSupported}
        scanQrCode={scanQrCode}
      />
      <NWCWalletTransactions wallet={wallet} />
      {wallet.pairingCode ? (
        <RelayList
          relays={new URL(wallet.pairingCode).searchParams.getAll("relay")}
        />
      ) : null}
    </div>
  );
}

export function WalletSettings() {
  const wallet = useWallet();
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
        <Coins
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
  return (
    <div className="flex flex-row gap-2 items-center">
      <PlugZap className="size-4 text-muted-foreground" />
      {wallet.walletService ? (
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
      )}
    </div>
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
    <div className="flex flex-row w-full items-center justify-between">
      <NWCWalletName wallet={wallet} />
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
  const balances = wallet.mintBalances || {};
  const balance = Object.values(balances).reduce((acc, b) => acc + b, 0);
  return (
    <Balance
      short={false}
      amount={balance}
      unit="sat"
      classNames={classNames}
    />
  );
}

function CashuWalletBalance({ wallet }: { wallet: NDKCashuWallet }) {
  const balances = wallet.mintBalances || {};
  const balance = Object.values(balances).reduce((acc, b) => acc + b, 0);
  const name = wallet.type;
  const amount = balance;
  return (
    <div className="flex flex-row w-full items-center justify-between">
      <div className="flex flex-row gap-2 items-center">
        <WalletIcon className="size-4 text-muted-foreground" />
        <span className="text-sm">{name}</span>
      </div>
      <Balance short={false} amount={amount} unit="sat" />
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
