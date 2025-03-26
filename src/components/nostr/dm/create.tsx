import { useState, ReactNode } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useAccount } from "@/lib/account";
//import { useNDK } from "@/lib/ndk";
import { useNavigate } from "@/lib/navigation";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  pubkeys: z.array(z.string()),
});

export function CreateGroup({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  //const ndk = useNDK();
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const account = useAccount();
  const canSign = account?.pubkey && !account.isReadOnly;
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log("NEWGROUP", values);
      const groupId = "TODO";
      navigate(`/dm/${groupId}`);
      setShowDialog(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    form.reset({
      pubkeys: [],
    });
  }

  function onOpenChange(open: boolean) {
    if (!open) {
      resetForm();
    }
    setShowDialog(open);
  }

  return canSign ? (
    <Dialog open={showDialog} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <div className="p-2 w-full">
            <Button
              aria-label="New group"
              type="button"
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Plus className="size-6" />
              <span className={className}>{t("private-group.create.new")}</span>
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("private-group.create.title")}</DialogTitle>
          <DialogDescription>
            {t("private-group.create.description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <>TODO</>
            <div className="flex flex-row justify-end space-y-4 space-x-2">
              <Button disabled={isLoading} type="submit">
                {t("group.create.form.submit.trigger")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  ) : null;
}
