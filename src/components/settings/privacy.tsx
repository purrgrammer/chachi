import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";

const privacySchema = z.object({});

export function Privacy() {
  const { t } = useTranslation();
  const form = useForm<z.infer<typeof privacySchema>>({
    resolver: zodResolver(privacySchema),
    defaultValues: {},
  });

  function onSubmit() {
    console.log("submit");
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-row gap-1 items-center flex-wrap">
            <Shield className="size-4 text-muted-foreground" />
            <h4 className="text-sm uppercase font-light text-muted-foreground">
              {t("settings.privacy.title")}
            </h4>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-sm text-muted-foreground">
            {t("settings.privacy.description", "Privacy settings")}
          </p>
        </div>
      </form>
    </Form>
  );
}
