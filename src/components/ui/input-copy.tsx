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
    <div className="w-full">
      <Input
        className="font-mono text-xs text-ellipsis bg-background"
        type={isSecret ? "password" : "text"}
        value={value}
        rightIcon={copied ? <Check /> : <Copy />}
        onRightIconClick={() => copy(value)}
        readOnly
        {...props}
      />
    </div>
  );
}
