import { toast } from "sonner";
import { useState, ReactNode } from "react";
import { LogIn, Puzzle } from "lucide-react";
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

  async function nip07Login() {
    try {
      setIsLoggingIn(true);
      await nip07();
    } catch (err) {
      console.error(err);
      toast.error("Failed to login with extension");
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
              <span>Get started</span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Get started</DialogTitle>
          <DialogDescription>Select the login method below.</DialogDescription>
        </DialogHeader>
        <div>
          <Button disabled={isLoggingIn} size="lg" onClick={nip07Login}>
            <Puzzle className="size-5" /> Connect with NIP-07
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
