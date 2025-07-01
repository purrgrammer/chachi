import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState, ReactNode, useEffect } from "react";
import { LogIn, Puzzle, Cable, RotateCw, Key, Egg } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useNip07Login,
  useNip46Login,
  useNsecLogin,
  useNstart,
} from "@/lib/account";
import { useTranslation } from "react-i18next";
import { nip19 } from "nostr-tools";

export function Login({
  isCompact,
  trigger,
}: {
  trigger?: ReactNode;
  isCompact?: boolean;
}) {
  const [remoteSigner, setRemoteSigner] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [privkey, setPrivkey] = useState("");
  const hash = window.location.hash;
  const navigate = useNavigate();
  const { createAccount } = useNstart();

  const nip07 = useNip07Login();
  const nip46 = useNip46Login();
  const nsec = useNsecLogin();

  const { t } = useTranslation();

  useEffect(() => {
    if (hash?.startsWith("#nostr-login")) {
      const nsec = hash.split("=")[1];
      const decoded = nip19.decode(nsec);
      if (decoded.type === "nsec") {
        const privkey = Buffer.from(decoded.data).toString("hex");
        nsecLogin(privkey);
      }
      navigate(window.location.pathname, { replace: true });
    }
  }, [hash]);

  async function nip46Login() {
    try {
      setIsLoggingIn(true);
      await nip46(remoteSigner);
    } catch (err) {
      console.error(err);
      toast.error(t("user.login.remote.error"));
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function nip07Login() {
    try {
      setIsLoggingIn(true);
      await nip07();
    } catch (err) {
      console.error(err);
      toast.error(t("user.login.extension.error"));
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function nsecLogin(privkey: string) {
    try {
      setIsLoggingIn(true);
      await nsec(privkey);
    } catch (err) {
      console.error(err);
      toast.error(t("user.login.nsec.error"));
    } finally {
      setIsLoggingIn(false);
    }
  }

  function onOpenChange(open: boolean) {
    if (!open) {
      setRemoteSigner("");
      setIsLoggingIn(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            aria-label="Get started"
            className={isCompact ? "size-8" : "w-full"}
          >
            {isCompact ? (
              <span>
                <LogIn className="size-5" />
              </span>
            ) : (
              <span>{t("user.login.start")}</span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("user.login.title")}</DialogTitle>
          <DialogDescription>{t("user.login.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-0">
              <h2 className="text-lg font-semibold">
                {t("user.login.new-account")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("user.login.new-account-description")}
              </p>
            </div>
            <Button size="lg" onClick={createAccount}>
              <Egg />
              {t("user.login.new-account-button")}
            </Button>
          </div>
          <div className="flex flex-col gap-0">
            <h2 className="text-lg font-semibold">{t("user.login.options")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("user.login.options-description")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("user.login.extension.label")}</Label>
            <Button
              variant="outline"
              disabled={isLoggingIn}
              onClick={nip07Login}
            >
              <Puzzle className="size-5" /> {t("user.login.connect")}
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("user.login.remote.label")}</Label>
            <div className="flex flex-row gap-2">
              <Input
                disabled={isLoggingIn}
                placeholder="bunker://"
                value={remoteSigner}
                onChange={(e) => setRemoteSigner(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={isLoggingIn || !remoteSigner}
                onClick={nip46Login}
              >
                {isLoggingIn ? (
                  <RotateCw className="animate-spin size-5" />
                ) : (
                  <Cable className="size-5" />
                )}{" "}
                {t("user.login.connect")}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("user.login.nsec.label")}</Label>
            <div className="flex flex-row gap-2">
              <Input
                disabled={isLoggingIn}
                placeholder="nsec1..."
                value={privkey}
                onChange={(e) => setPrivkey(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={isLoggingIn || !privkey}
                onClick={() => nsecLogin(privkey)}
              >
                {isLoggingIn ? (
                  <RotateCw className="animate-spin size-5" />
                ) : (
                  <Key className="size-5" />
                )}{" "}
                {t("user.login.connect")}
              </Button>
            </div>{" "}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
