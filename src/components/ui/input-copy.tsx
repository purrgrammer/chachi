import { toast } from "sonner";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

export function InputCopy({ value, ...props }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t("copy.success"));
    } catch (err) {
      console.error(err);
      toast.error(t("copy.error"));
    } finally {
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Input
      className="px-1 pr-10 w-full h-8 h-10 font-mono text-xs text-ellipsis bg-background"
      type="text"
      value={value}
      rightIcon={copied ? <Check /> : <Copy />}
      onRightIconClick={copy}
      rightIconClassName="top-1 right-1"
      readOnly
      {...props}
    />
  );
}
