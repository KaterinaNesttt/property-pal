import * as React from "react";
import IosDrumPicker from "@/components/ui/ios-date-picker";

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

function Calendar({ selected, onSelect, className }: CalendarProps) {
  const value = selected ? selected.toISOString().slice(0, 10) : "";

  return (
    <IosDrumPicker
      className={className}
      onChange={(nextValue) => {
        onSelect?.(nextValue ? new Date(`${nextValue}T00:00:00`) : undefined);
      }}
      value={value}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
