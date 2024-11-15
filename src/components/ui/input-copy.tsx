import { toast } from "sonner";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";

export function InputCopy({ value, ...props }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't copy");
    } finally {
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Input
      className="font-mono text-xs h-10 text-ellipsis w-full px-1 pr-10 h-8 bg-background border rounded-lg"
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
