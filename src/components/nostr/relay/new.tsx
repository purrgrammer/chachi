import { DatabaseZap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import services from "@/lib/relay/services";
import { useTranslation } from "react-i18next";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usePubkey } from "@/lib/account";

const formSchema = z.object({
  service: z.string().min(1, "Service is required"),
  name: z
    .string()
    .min(1, "Name is required")
    .regex(/^[^\s]+$/, "Name cannot contain spaces"),
});

type FormData = z.infer<typeof formSchema>;

export function NewRelay() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<string | null>(null);
  const pubkey = usePubkey();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service: services[0]?.domain || "",
    },
  });
  const service = form.watch("service");
  const selectedService = services.find((s) => s.domain === service);

  const handleSubmit = async (data: FormData) => {
    try {
      if (!selectedService) {
        throw new Error("Service not found");
      }
      if (!pubkey) {
        throw new Error("Pubkey not found");
      }

      setIsLoading(true);
      const order = await selectedService.createRelay({
        name: data.name,
        pubkey,
      });
      setOrder(order.id);
      console.log("RELAYTOOLS ORDER", order);
      toast.success(t("relay.new.order-success"));
    } catch (err) {
      console.error(err);
      toast.error(t("relay.new.error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button>
          <DatabaseZap />
          {t("relay.new.title")}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-full">
        <div className="p-4 w-lg mx-auto">
          <DrawerHeader className="p-0 mb-8">
            <DrawerTitle>{t("relay.new.title")}</DrawerTitle>
            <DrawerDescription>{t("relay.new.description")}</DrawerDescription>
          </DrawerHeader>
          {order ? (
            <pre className="whitespace-pre-wrap overflow-auto max-h-48">
              {JSON.stringify(order, null, 2)}
            </pre>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("relay.new.service")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t("relay.new.select_service")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem
                              key={service.domain}
                              value={service.domain}
                            >
                              {service.domain}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("relay.new.name")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t("relay.new.name_placeholder")}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DrawerFooter className="px-0">
                  <Button
                    type="submit"
                    disabled={
                      !form.formState.isValid || !selectedService || isLoading
                    }
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 animate-spin" />
                    ) : (
                      <DatabaseZap className="mr-2" />
                    )}
                    {t("relay.new.create")}
                  </Button>
                </DrawerFooter>
              </form>
            </Form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
