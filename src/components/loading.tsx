import { RotateCw, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function Loading({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn("w-full h-full place-content-center", className)}>
      <div className="flex flex-col gap-4 items-center">
        <Network className="w-10 h-10 animate-pulse text-muted-foreground" />
        <div className="flex flex-row gap-2 items-center">
          <RotateCw className="animate-spin size-4 text-muted-foreground" />
          <p className="text-muted-foreground">{t("events.loading")}</p>
        </div>
      </div>
    </div>
  );
}
