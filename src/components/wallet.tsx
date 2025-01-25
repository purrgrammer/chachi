import { useState, useMemo } from "react";
import { NostrEvent } from "nostr-tools";
import {
  Wallet as WalletIcon,
  Puzzle,
  Cable,
  RotateCw,
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
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import {
  NDKWallet,
  NDKCashuWallet,
  NDKWebLNWallet,
  NDKNWCWallet,
} from "@nostr-dev-kit/ndk-wallet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNDK } from "@/lib/ndk";
import { useRelays, useRelaySet } from "@/lib/nostr";
import { formatShortNumber } from "@/lib/number";
import { useHost } from "@/lib/hooks";
import {
  defaultMints,
  useWallet,
  useDeposit,
  useCreateWallet,
  useTransactions,
  useDefaultWallet,
  Transaction,
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

// todo: dialog
function CreateWallet() {
  const { t } = useTranslation();
  const myRelays = useRelays();
  const [name, setName] = useState("chachi");
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
    setRelays([...relays, relay]);
    setSelectedRelays([...selectedRelays, relay]);
    setRelay("");
  }

  async function onCreate() {
    try {
      await createWallet(name, selectedRelays, selectedMints);
    } catch (err) {
      console.error(err);
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
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <Label>{t("wallet.name")}</Label>
        <span className="text-xs text-muted-foreground">
          {t("wallet.name-description")}
        </span>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
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
              disabled={selectedMints.length === 1 && selectedMints[0] === m}
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
              disabled={selectedRelays.length === 1 && selectedRelays[0] === r}
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
        disabled={selectedRelays.length === 0 || selectedMints.length === 0}
        className="w-full"
        onClick={onCreate}
      >
        <WalletIcon /> {t("wallet.create")}
      </Button>
    </div>
  );
}

export function ConnectWallet() {
  const { t } = useTranslation();
  const ndk = useNDK();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingWebln, setIsLoadingWebln] = useState(false);
  const [connectString, setConnectString] = useState("");
  const [, setDefaultWallet] = useDefaultWallet();
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
      //const relays = new URL(connectString).searchParams.getAll("relay");
      //const walletNdk = new NDK({ explicitRelayUrls: relays });
      const nwc = new NDKNWCWallet(ndk);
      // todo: add explicit relays
      try {
        setIsConnecting(true);
        await nwc.initWithPairingCode(connectString);
        // todo: set as active wallet
        setDefaultWallet({ type: "nwc", connection: connectString });
        ndk.wallet = nwc;
      } catch (e) {
        console.error(e);
        toast.error(t("wallet.dialog.nwc-error"));
      } finally {
        setIsConnecting(false);
      }
    } catch (e) {
      console.error(e);
      toast.error(t("wallet.dialog.nwc-error"));
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="fit">
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
          <CreateWallet />
          <p className="my-2 mx-auto text-xs text-muted-foreground">
            {t("user.login.or")}
          </p>
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
            disabled={isLoadingWebln}
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
  const isCredit = tx.direction === "in";
  const amount = tx.unit === "msat" ? tx.amount / 1000 : tx.amount;
  const fee = tx.fee;
  return (
    <div className="flex flex-row justify-between">
      <div className="flex flex-row gap-2 items-center">
        {isCredit ? (
          tx.p ? (
            <div className="size-12 relative">
              <User
                pubkey={tx.p}
                classNames={{
                  wrapper: "flex-col gap-0",
                  avatar: "size-9",
                  name: "text-xs text-muted-foreground",
                }}
              />
              <ArrowDownRight className="size-5 text-green-200 absolute top-0 left-0" />
            </div>
          ) : (
            <div className="size-12 relative flex items-center justify-center">
              <MintIcon url={tx.mint} className="size-9" />
              <ArrowDownRight className="size-5 text-green-200 absolute top-0 left-0" />
            </div>
          )
        ) : tx.p ? (
          <div className="size-12 relative">
            <User
              pubkey={tx.p}
              classNames={{
                wrapper: "flex-col gap-0",
                avatar: "size-9",
                name: "text-xs text-muted-foreground",
              }}
            />
            <ArrowUpRight className="size-5 text-destructive absolute -top-1.5 right-0" />
          </div>
        ) : (
          <div className="size-12 relative">
            <ArrowUpRight className="size-12 text-destructive" />
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          {tx.description ? (
            <span className="text-md line-clamp-1">{tx.description}</span>
          ) : null}
          {isCredit ? (
            <span className="text-xs text-muted-foreground line-clamp-1">
              <MintName url={tx.mint} />
            </span>
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
}

function WalletTransactions({
  wallet,
  pubkey,
}: {
  wallet: NDKCashuWallet;
  pubkey: string;
}) {
  const transactions = useTransactions(pubkey, wallet);
  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) => b.created_at - a.created_at);
  }, [transactions]);
  return (
    <ScrollArea className="h-80">
      <div className="flex flex-col gap-2">
        {sorted.map((tx) => (
          <Tx key={tx.id} tx={tx} />
        ))}
      </div>
    </ScrollArea>
  );
}

function CashuWalletSettings({ wallet }: { wallet: NDKCashuWallet }) {
  // todo: deposit invoice
  const ndk = useNDK();
  const relays = useRelays();
  const relaySet = useRelaySet(relays);
  const [isLoading, setIsLoading] = useState(false);
  const [, setDefaultWallet] = useDefaultWallet();
  const pubkey = usePubkey();
  const { t } = useTranslation();
  const [isDepositing, setIsDepositing] = useState(false);
  const [invoice, setInvoice] = useState("");
  const deposit = useDeposit();
  const balances = wallet?.mintBalances || {};
  const balance = Object.values(balances).reduce((acc, b) => acc + b, 0);

  // todo: ask for amount
  async function onDeposit() {
    return;
    try {
      setIsDepositing(true);
      const pr = await deposit(
        1000,
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

  async function makeDefaultWallet(w: NDKCashuWallet) {
    try {
      setIsLoading(true);
      const p2pk = await w.getP2pk();
      if (!p2pk) {
        toast.error("wallet.make-default-error");
        return;
      }
      const ev = new NDKEvent(ndk, {
        kind: NDKKind.CashuMintList,
        content: "",
        tags: [
          ["pubkey", p2pk],
          ...w.relays.map((r) => ["relay", r]),
          ...w.mints.map((m) => ["mint", m]),
        ],
      } as NostrEvent);
      await ev.publish(relaySet);
      // todo: store wallet event
      setDefaultWallet({
        type: "nip60",
        id: w.walletId,
      });
      toast.success("wallet.make-default-success");
    } catch (err) {
      console.error(err);
      toast.error("wallet.make-default-error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {invoice ? (
        <>TODO: invoice</>
      ) : wallet ? (
        <>
          {wallet.name ? (
            <h4 className="text-xl font-light">{wallet.name}</h4>
          ) : null}
          <div className="flex flex-col gap-3">
            <div className="w-full flex items-center justify-center">
              <div className="flex flex-row gap-0 items-center">
                <Bitcoin className="size-12 text-muted-foreground" />
                <span className="text-6xl font-mono">
                  {formatShortNumber(balance)}
                </span>
              </div>
            </div>
            <div className="flex flex-row gap-2 justify-around">
              <Button
                variant="outline"
                className="flex-1"
                disabled={isDepositing}
                onClick={onDeposit}
              >
                {isDepositing ? (
                  <RotateCw className="animate-spin" />
                ) : (
                  <ArrowDownRight />
                )}
                {t("wallet.deposit")}
              </Button>
              <Button variant="outline" size="bigIcon">
                <ScanQrCode />
              </Button>
              <Button variant="outline" className="flex-1">
                {isDepositing ? (
                  <RotateCw className="animate-spin" />
                ) : (
                  <ArrowUpRight />
                )}
                {t("wallet.withdraw")}
              </Button>
            </div>
          </div>
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
          <div className="flex flex-col gap-1">
            <div className="flex flex-row gap-1 items-center">
              <Server className="size-4 text-muted-foreground" />
              <h4 className="text-sm text-muted-foreground uppercase font-light">
                {t("wallet.relays")}
              </h4>
            </div>
            <ul>
              {wallet.relays.map((r) => (
                <li key={r} className="flex flex-row items-center gap-1.5">
                  <RelayIcon relay={r} className="size-5" />
                  <span className="text-sm font-mono">
                    <RelayName relay={r} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
      <Button disabled={isLoading} onClick={() => makeDefaultWallet(wallet)}>
        {t("wallet.make-default")}
      </Button>
    </div>
  );
}

function WebLNWalletSettings({ wallet }: { wallet: NDKWebLNWallet }) {
  return <>{wallet.walletId}</>;
}

function NWCWalletSettings({ wallet }: { wallet: NDKNWCWallet }) {
  return <>{wallet.walletId}</>;
}

export function WalletSettings() {
  const wallet = useWallet();

  if (wallet instanceof NDKCashuWallet) {
    return <CashuWalletSettings wallet={wallet} />;
  } else if (wallet instanceof NDKWebLNWallet) {
    return <WebLNWalletSettings wallet={wallet} />;
  } else if (wallet instanceof NDKNWCWallet) {
    return <NWCWalletSettings wallet={wallet} />;
  } else {
    return <>TODO</>;
  }
}

function WebLNWalletBalance({ wallet }: { wallet: NDKWebLNWallet }) {
  return <>{wallet.walletId}</>;
}

function NWCWalletBalance({ wallet }: { wallet: NDKNWCWallet }) {
  return <>{wallet.walletId}</>;
}

function CashuWalletBalance({ wallet }: { wallet: NDKCashuWallet }) {
  const balances = wallet.mintBalances || {};
  const balance = Object.values(balances).reduce((acc, b) => acc + b, 0);
  const { t } = useTranslation();
  const name = wallet.name || t("wallet.title");
  const unit = wallet.unit === "msat" ? "sat" : wallet.unit || "sat";
  const amount = wallet.unit === "msat" ? balance * 1000 : balance;
  return (
    <div className="flex flex-row w-full items-center justify-between">
      <div className="flex flex-row gap-2 items-center">
        <WalletIcon className="size-4 text-muted-foreground" />
        <span className="text-sm">{name}</span>
      </div>
      <div className="flex flex-row gap-0.5 items-center">
        {unit === "sat" ? (
          <Bitcoin className="size-4 text-muted-foreground" />
        ) : null}
        {unit === "eur" ? (
          <Euro className="size-4 text-muted-foreground" />
        ) : null}
        {unit === "usd" ? (
          <DollarSign className="size-4 text-muted-foreground" />
        ) : null}
        <span className="text-sm font-mono">
          {amount ? formatShortNumber(amount) : "--"}
        </span>
      </div>
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
