"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

export function DatePicker({
  onSelect,
  className,
}: {
  onSelect?: (d: Date) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [date, setDate] = React.useState<Date>();

  function onDateSelect(date?: Date) {
    setDate(date);
    if (date) {
      onSelect?.(date);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full text-left font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 w-4 h-4" />
          {date ? (
            format(date, "PPP")
          ) : (
            <span>{t("poll.expiration.date")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
