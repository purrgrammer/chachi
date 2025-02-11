import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCopy } from "@/lib/hooks";

export function InputCopy({
  value,
  isSecret,
  ...props
}: {
  value: string;
  isSecret?: boolean;
}) {
  const [copied, copy] = useCopy();

  return (
    <Input
      className="px-1 pr-10 w-full h-8 h-10 font-mono text-xs text-ellipsis bg-background"
      type={isSecret ? "password" : "text"}
      value={value}
      rightIcon={copied ? <Check /> : <Copy />}
      onRightIconClick={() => copy(value)}
      rightIconClassName="top-1 right-1"
      readOnly
      {...props}
    />
  );
}
