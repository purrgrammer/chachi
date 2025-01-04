import { toast } from "sonner";
import { useState, ReactNode } from "react";
import { LogIn, Puzzle, Cable, RotateCw } from "lucide-react";
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
import { useNip07Login, useNip46Login } from "@/lib/account";
import { useTranslation } from "react-i18next";

// TODO: translate strings
export function Login({
  isCompact,
  trigger,
}: {
  trigger?: ReactNode;
  isCompact?: boolean;
}) {
  const [remoteSigner, setRemoteSigner] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const nip07 = useNip07Login();
  const nip46 = useNip46Login();
  const { t } = useTranslation();

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
      toast.error(t("use.login.extension.error"));
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
        <div className="flex flex-col gap-2">
          <Button disabled={isLoggingIn} size="lg" onClick={nip07Login}>
            <Puzzle className="size-5" /> {t("user.login.extension.label")}
          </Button>
          <p className="my-2 mx-auto text-xs text-muted-foreground">
            {t("user.login.or")}
          </p>
          <Label>{t("user.login.remote.label")}</Label>
          <Input
            disabled={isLoggingIn}
            placeholder="bunker://"
            value={remoteSigner}
            onChange={(e) => setRemoteSigner(e.target.value)}
          />
          <div />
          <Button
            variant="outline"
            disabled={isLoggingIn || !remoteSigner}
            size="lg"
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
      </DialogContent>
    </Dialog>
  );
}
