import { toast } from "sonner";
import { useState, ReactNode } from "react";
import { LogIn, Puzzle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNip07Login } from "@/lib/account";

export function Login({
  isCompact,
  trigger,
}: {
  trigger?: ReactNode;
  isCompact?: boolean;
}) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const nip07 = useNip07Login();
  const { t } = useTranslation();

  async function nip07Login() {
    try {
      setIsLoggingIn(true);
      await nip07();
    } catch (err) {
      console.error(err);
      toast.error(t("nav.user.login.error"));
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <Dialog>
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
              <span>{t("nav.user.login.start")}</span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("nav.user.login.title")}</DialogTitle>
          <DialogDescription>
            {t("nav.user.login.description")}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Button disabled={isLoggingIn} size="lg" onClick={nip07Login}>
            <Puzzle className="size-5" /> {t("nav.user.login.nip-07")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
