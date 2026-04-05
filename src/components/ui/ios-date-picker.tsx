import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
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

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const parseDate = (value: string) => {
  const [yearRaw, monthRaw, dayRaw] = value.split("-").map(Number);
  const now = new Date();

  return {
    year: Number.isFinite(yearRaw) ? yearRaw : now.getFullYear(),
    month: Number.isFinite(monthRaw) ? monthRaw : now.getMonth() + 1,
    day: Number.isFinite(dayRaw) ? dayRaw : now.getDate(),
  };
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

interface DrumColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const DrumColumn = ({ items, selectedIndex, onSelect }: DrumColumnProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const target = selectedIndex * ROW_HEIGHT;
    if (Math.abs(node.scrollTop - target) > 1) {
      node.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [selectedIndex]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return (
    <div className="relative flex-1 overflow-hidden rounded-[1.4rem] bg-white/5">
      <div className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-9 -translate-y-1/2 rounded-xl border-y border-btns/40 bg-btns/20" />
      <div
        ref={ref}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          const node = event.currentTarget;
          const nextIndex = Math.max(0, Math.min(items.length - 1, Math.round(node.scrollTop / ROW_HEIGHT)));
          onSelect(nextIndex);

          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = window.setTimeout(() => {
            if (!ref.current || ref.current !== node) {
              return;
            }

            node.scrollTo({
              top: nextIndex * ROW_HEIGHT,
              behavior: "smooth",
            });
          }, 90);
        }}
        style={{ height: PICKER_HEIGHT, paddingTop: EDGE_PADDING, paddingBottom: EDGE_PADDING }}
      >
        {items.map((item, index) => {
          const distance = Math.abs(index - selectedIndex);
          const textClass =
            distance === 0 ? "text-white scale-100" : distance === 1 ? "text-white/70 scale-[0.97]" : "text-white/40 scale-[0.9]";

          return (
            <button
              key={`${item}-${index}`}
              className={cn(
                "flex h-9 w-full snap-center items-center justify-center px-2 text-center text-sm font-medium transition-all duration-150",
                textClass,
              )}
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

export interface IosDrumPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const IosDrumPicker = ({ value, onChange, placeholder = "Оберіть дату", className }: IosDrumPickerProps) => {
  const today = new Date();
  const base = parseDate(value || today.toISOString().slice(0, 10));

  const years = useMemo(() => {
    const currentYear = today.getFullYear();
    return Array.from({ length: 16 }, (_, index) => String(currentYear - 5 + index));
  }, [today]);
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
    onChange(buildDate(nextYear, nextMonth, nextDay));
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
            <DrumColumn items={days} selectedIndex={dayIndex} onSelect={(index) => updateDate(base.year, base.month, index + 1)} />
            <DrumColumn items={months} selectedIndex={monthIndex} onSelect={(index) => updateDate(base.year, index + 1, base.day)} />
            <DrumColumn items={years} selectedIndex={yearIndex} onSelect={(index) => updateDate(Number(years[index]), base.month, base.day)} />
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
