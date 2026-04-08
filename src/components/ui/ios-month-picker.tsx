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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseMonth = (value: string) => {
  const [yearRaw, monthRaw] = value.split("-").map(Number);
  const now = new Date();
  return {
    year: clamp(Number.isFinite(yearRaw) ? yearRaw : now.getFullYear(), MIN_YEAR, MAX_YEAR),
    month: clamp(Number.isFinite(monthRaw) ? monthRaw : now.getMonth() + 1, 1, 12),
  };
};

const formatMonth = (value: string) => {
  if (!value) return "";
  const { year, month } = parseMonth(value);
  return `${monthNames[month - 1]} ${year}`;
};

const buildMonth = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

interface IosMonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const IosMonthPicker = ({ value, onChange, placeholder = "Оберіть місяць", className }: IosMonthPickerProps) => {
  const now = new Date();
  const base = parseMonth(value || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const years = useMemo(() => Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, index) => String(MIN_YEAR + index)), []);
  const yearIndex = Math.max(0, years.findIndex((year) => Number(year) === base.year));
  const monthIndex = Math.max(0, base.month - 1);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const normalized = buildMonth(base.year, base.month);
    if (value && value !== normalized) {
      onChange(normalized);
    }
  }, [base.month, base.year, onChange, value]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button className={cn("glass-input flex w-full items-center justify-between gap-3 text-left", value ? "text-white" : "text-slate-400", className)} type="button">
          <span>{value ? formatMonth(value) : placeholder}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open ? "rotate-180" : "")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,22rem)] rounded-3xl border border-white/10 bg-black/80 p-4 text-white shadow-2xl backdrop-blur-2xl" sideOffset={10}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <IosDrumColumn items={monthNames} loop selectedIndex={monthIndex} onSelect={(index) => onChange(buildMonth(base.year, index + 1))} />
            <IosDrumColumn items={years} selectedIndex={yearIndex} onSelect={(index) => onChange(buildMonth(Number(years[index]), base.month))} />
          </div>
          <button className="glass-button justify-center bg-btns/15 text-white" onClick={() => setOpen(false)} type="button">
            Готово
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default IosMonthPicker;
