import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import IosDrumColumn from "@/components/ui/ios-drum-column";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MIN_YEAR = 1985;
const MAX_YEAR = 2047;

const monthNames = [
  "Січень",
  "Лютий",
  "Березень",
  "Квітень",
  "Травень",
  "Червень",
  "Липень",
  "Серпень",
  "Вересень",
  "Жовтень",
  "Листопад",
  "Грудень",
];

const monthNamesGenitive = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
];

const pad = (value: number) => String(value).padStart(2, "0");
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const parseDate = (value: string) => {
  const [yearRaw, monthRaw, dayRaw] = value.split("-").map(Number);
  const now = new Date();
  const year = clamp(Number.isFinite(yearRaw) ? yearRaw : now.getFullYear(), MIN_YEAR, MAX_YEAR);
  const month = clamp(Number.isFinite(monthRaw) ? monthRaw : now.getMonth() + 1, 1, 12);
  const day = clamp(Number.isFinite(dayRaw) ? dayRaw : now.getDate(), 1, getDaysInMonth(year, month));

  return { year, month, day };
};

const formatDisplayDate = (value: string) => {
  if (!value) {
    return "";
  }

  const { day, month, year } = parseDate(value);
  return `${day} ${monthNamesGenitive[month - 1]} ${year}`;
};

const buildDate = (year: number, month: number, day: number) =>
  `${year}-${pad(month)}-${pad(Math.min(day, getDaysInMonth(year, month)))}`;

export interface IosDrumPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const IosDrumPicker = ({ value, onChange, placeholder = "Оберіть дату", className }: IosDrumPickerProps) => {
  const today = new Date();
  const base = parseDate(value || today.toISOString().slice(0, 10));

  const years = useMemo(() => Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, index) => String(MIN_YEAR + index)), []);
  const months = monthNames;
  const days = useMemo(() => Array.from({ length: getDaysInMonth(base.year, base.month) }, (_, index) => String(index + 1)), [base.month, base.year]);

  const yearIndex = Math.max(0, years.findIndex((year) => Number(year) === base.year));
  const monthIndex = Math.max(0, base.month - 1);
  const dayIndex = Math.max(0, Math.min(days.length - 1, base.day - 1));

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const clamped = buildDate(base.year, base.month, base.day);
    if (value && value !== clamped) {
      onChange(clamped);
    }
  }, [base.day, base.month, base.year, onChange, value]);

  const updateDate = (nextYear: number, nextMonth: number, nextDay: number) => {
    onChange(buildDate(clamp(nextYear, MIN_YEAR, MAX_YEAR), clamp(nextMonth, 1, 12), nextDay));
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "glass-input flex w-full items-center justify-between gap-3 text-left",
            value ? "text-white" : "text-slate-400",
            className,
          )}
          type="button"
        >
          <span>{value ? formatDisplayDate(value) : placeholder}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open ? "rotate-180" : "")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(92vw,26rem)] rounded-3xl border border-white/10 bg-black/80 p-4 text-white shadow-2xl backdrop-blur-2xl"
        sideOffset={10}
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-3">
            <IosDrumColumn items={days} loop selectedIndex={dayIndex} onSelect={(index) => updateDate(base.year, base.month, index + 1)} />
            <IosDrumColumn items={months} loop selectedIndex={monthIndex} onSelect={(index) => updateDate(base.year, index + 1, base.day)} />
            <IosDrumColumn items={years} selectedIndex={yearIndex} onSelect={(index) => updateDate(Number(years[index]), base.month, base.day)} />
          </div>
          <button className="glass-button justify-center bg-btns/15 text-white" onClick={() => setOpen(false)} type="button">
            Готово
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default IosDrumPicker;
