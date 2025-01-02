import React from "react";
import { CircleSlash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function Empty({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("w-full h-full place-content-center", className)}>
      <div className="flex flex-col gap-4 items-center">
        <CircleSlash2 className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">{t("events.none")}</p>
        {children}
      </div>
    </div>
  );
}
