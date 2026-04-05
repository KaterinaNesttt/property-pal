import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import IosDrumPicker from "@/components/ui/ios-date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const formatDisplay = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const splitValue = (value: string) => {
  if (!value) return { date: "", time: "09:00" };
  const [datePart, timePart] = value.split("T");
  return {
    date: datePart ?? "",
    time: timePart ? timePart.slice(0, 5) : "09:00",
  };
};

interface IosDateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const IosDateTimePicker = ({ value, onChange, placeholder = "Оберіть дату і час", className }: IosDateTimePickerProps) => {
  const [open, setOpen] = useState(false);
  const parts = useMemo(() => splitValue(value), [value]);

  const updateValue = (nextDate: string, nextTime: string) => {
    if (!nextDate) {
      onChange("");
      return;
    }
    onChange(`${nextDate}T${nextTime}`);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button className={cn("glass-input flex w-full items-center justify-between gap-3 text-left", value ? "text-white" : "text-slate-400", className)} type="button">
          <span>{value ? formatDisplay(value) : placeholder}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open ? "rotate-180" : "")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] rounded-3xl border border-white/10 bg-black/80 p-4 text-white shadow-2xl backdrop-blur-2xl" sideOffset={10}>
        <div className="grid gap-4">
          <IosDrumPicker onChange={(nextDate) => updateValue(nextDate, parts.time)} value={parts.date} />
          <label className="grid gap-2 text-sm text-slate-300">
            Час
            <input
              className="glass-input"
              onChange={(event) => updateValue(parts.date, event.target.value)}
              step="60"
              type="time"
              value={parts.time}
            />
          </label>
          <button className="glass-button justify-center bg-btns/15 text-white" onClick={() => setOpen(false)} type="button">
            Готово
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default IosDateTimePicker;
