import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 36;
const PICKER_HEIGHT = ROW_HEIGHT * 5;
const EDGE_PADDING = ROW_HEIGHT * 2;

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

const parseMonth = (value: string) => {
  const [yearRaw, monthRaw] = value.split("-").map(Number);
  const now = new Date();
  return {
    year: Number.isFinite(yearRaw) ? yearRaw : now.getFullYear(),
    month: Number.isFinite(monthRaw) ? monthRaw : now.getMonth() + 1,
  };
};

const formatMonth = (value: string) => {
  if (!value) return "";
  const { year, month } = parseMonth(value);
  return `${monthNames[month - 1]} ${year}`;
};

const buildMonth = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

interface DrumColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const DrumColumn = ({ items, selectedIndex, onSelect }: DrumColumnProps) => {
  return (
    <div className="relative flex-1 overflow-hidden rounded-[1.4rem] bg-white/5">
      <div className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-9 -translate-y-1/2 rounded-xl border-y border-btns/40 bg-btns/20" />
      <div className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ height: PICKER_HEIGHT, paddingTop: EDGE_PADDING, paddingBottom: EDGE_PADDING }}>
        {items.map((item, index) => {
          const distance = Math.abs(index - selectedIndex);
          const textClass = distance === 0 ? "text-white scale-100" : distance === 1 ? "text-white/70 scale-[0.97]" : "text-white/40 scale-[0.9]";
          return (
            <button
              key={`${item}-${index}`}
              className={cn("flex h-9 w-full snap-center items-center justify-center px-2 text-center text-sm font-medium transition-all duration-150", textClass)}
              onClick={() => onSelect(index)}
              type="button"
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface IosMonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const IosMonthPicker = ({ value, onChange, placeholder = "Оберіть місяць", className }: IosMonthPickerProps) => {
  const now = new Date();
  const base = parseMonth(value || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const years = useMemo(() => Array.from({ length: 16 }, (_, index) => String(now.getFullYear() - 5 + index)), [now]);
  const yearIndex = Math.max(0, years.findIndex((year) => Number(year) === base.year));
  const monthIndex = Math.max(0, base.month - 1);
  const [open, setOpen] = useState(false);

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
            <DrumColumn items={monthNames} selectedIndex={monthIndex} onSelect={(index) => onChange(buildMonth(base.year, index + 1))} />
            <DrumColumn items={years} selectedIndex={yearIndex} onSelect={(index) => onChange(buildMonth(Number(years[index]), base.month))} />
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
