import { MessageSquare, Video } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

export type GroupType = "chat" | "chat-av";

export function groupTypeFromFlags(isLivekit?: boolean): GroupType {
  if (isLivekit) return "chat-av";
  return "chat";
}

export function flagsFromGroupType(type: GroupType): { isLivekit: boolean } {
  switch (type) {
    case "chat-av":
      return { isLivekit: true };
    default:
      return { isLivekit: false };
  }
}

const options: { value: GroupType; icon: typeof MessageSquare; labelKey: string; descKey: string }[] = [
  { value: "chat", icon: MessageSquare, labelKey: "group.type.chat.label", descKey: "group.type.chat.description" },
  { value: "chat-av", icon: Video, labelKey: "group.type.chat-av.label", descKey: "group.type.chat-av.description" },
];

export function GroupTypeSelector({
  value,
  onChange,
  disabled,
  livekitSupported,
}: {
  value: GroupType;
  onChange: (value: GroupType) => void;
  disabled?: boolean;
  /** When false, the chat-av option is hidden. When undefined (loading), it's shown but disabled. */
  livekitSupported?: boolean;
}) {
  const { t } = useTranslation();

  const visibleOptions = livekitSupported === false
    ? options.filter((o) => o.value !== "chat-av")
    : options;

  if (visibleOptions.length <= 1) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">
        {t("group.type.title")}
      </h4>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as GroupType)}
        disabled={disabled}
        className="grid gap-2"
      >
        {visibleOptions.map(({ value: optValue, icon: Icon, labelKey, descKey }) => (
          <label
            key={optValue}
            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              value === optValue ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <RadioGroupItem value={optValue} id={`group-type-${optValue}`} />
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="space-y-0.5">
              <Label htmlFor={`group-type-${optValue}`} className="text-sm font-medium cursor-pointer">
                {t(labelKey)}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t(descKey)}
              </p>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
