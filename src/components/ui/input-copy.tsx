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
    <div className="bg-red-100 w-full">
      <Input
        className="h-8 h-10 font-mono text-xs text-ellipsis bg-background"
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
