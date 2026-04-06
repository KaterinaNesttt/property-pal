import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const PICKER_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
const EDGE_PADDING = ROW_HEIGHT * 2;
const MIN_YEAR = 1985;
const MAX_YEAR = 2047;
const LOOP_COPIES = 3;
const SETTLE_DELAY = 140;
const ADJUSTING_LOCK = 180;

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
const mod = (value: number, base: number) => ((value % base) + base) % base;
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

interface DrumColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  loop?: boolean;
}

const DrumColumn = ({ items, selectedIndex, onSelect, loop = false }: DrumColumnProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isAdjustingRef = useRef(false);
  const lastReportedIndexRef = useRef(-1);
  const lastItemsLengthRef = useRef(items.length);
  const lastSelectedIndexRef = useRef(selectedIndex);

  const safeSelectedIndex = items.length > 0 ? clamp(selectedIndex, 0, items.length - 1) : 0;
  const renderedItems = useMemo(
    () => (loop && items.length > 0 ? Array.from({ length: LOOP_COPIES }, () => items).flat() : items),
    [items, loop],
  );
  const middleOffset = loop && items.length > 0 ? items.length : 0;
  const displayIndex = loop && items.length > 0 ? middleOffset + safeSelectedIndex : safeSelectedIndex;

  useEffect(() => {
    const node = ref.current;
    if (!node || items.length === 0) {
      return;
    }

    const itemsLengthChanged = lastItemsLengthRef.current !== items.length;
    const selectedChangedExternally = lastSelectedIndexRef.current !== selectedIndex;
    lastItemsLengthRef.current = items.length;
    lastSelectedIndexRef.current = selectedIndex;

    if (loop && !itemsLengthChanged && !selectedChangedExternally && node.scrollTop > 0) {
      return;
    }

    const target = displayIndex * ROW_HEIGHT;
    if (Math.abs(node.scrollTop - target) <= 1) {
      return;
    }

    isAdjustingRef.current = true;
    node.scrollTo({ top: target, behavior: "auto" });
    requestAnimationFrame(() => {
      isAdjustingRef.current = false;
    });
  }, [displayIndex, items.length, loop, selectedIndex]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return (
    <div className="relative flex-1 overflow-hidden rounded-[1.4rem] bg-white/5 [perspective:1200px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-black/55 via-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-9 -translate-y-1/2 rounded-xl border-y border-btns/40 bg-btns/20" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
      <div
        ref={ref}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [touch-action:pan-y] [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          if (items.length === 0 || isAdjustingRef.current) {
            return;
          }

          const node = event.currentTarget;
          const rawIndex = Math.round(node.scrollTop / ROW_HEIGHT);
          const normalizedIndex = loop ? mod(rawIndex, items.length) : clamp(rawIndex, 0, items.length - 1);

          if (lastReportedIndexRef.current !== normalizedIndex) {
            lastReportedIndexRef.current = normalizedIndex;
            onSelect(normalizedIndex);
          }

          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = window.setTimeout(() => {
            const baseIndex = loop ? middleOffset + normalizedIndex : normalizedIndex;
            isAdjustingRef.current = true;
            node.scrollTo({
              top: baseIndex * ROW_HEIGHT,
              behavior: "smooth",
            });
            if (loop) {
              lastSelectedIndexRef.current = normalizedIndex;
            }
            window.setTimeout(() => {
              isAdjustingRef.current = false;
            }, ADJUSTING_LOCK);
          }, SETTLE_DELAY);
        }}
        style={{ height: PICKER_HEIGHT, paddingTop: EDGE_PADDING, paddingBottom: EDGE_PADDING }}
      >
        {renderedItems.map((item, index) => {
          const activeIndex = loop && items.length > 0 ? middleOffset + safeSelectedIndex : safeSelectedIndex;
          const distance = Math.abs(index - activeIndex);
          const clampedDistance = Math.min(distance, 3);
          const textClass =
            distance === 0 ? "text-white scale-100 opacity-100" : distance === 1 ? "text-white/75 scale-[0.975] opacity-85" : "text-white/40 scale-[0.9] opacity-45";
          const transformStyle = {
            transform: `rotateX(${clampedDistance * 14}deg) scale(${distance === 0 ? 1 : distance === 1 ? 0.975 : 0.9}) translateZ(${Math.max(0, 24 - clampedDistance * 10)}px)`,
          };

          return (
            <button
              key={`${item}-${index}`}
              className={cn(
                "flex h-9 w-full snap-center items-center justify-center px-2 text-center text-sm font-medium transition-all duration-300 ease-out [transform-style:preserve-3d] will-change-transform",
                textClass,
              )}
              onClick={() => onSelect(loop && items.length > 0 ? mod(index, items.length) : index)}
              style={transformStyle}
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
            <DrumColumn items={days} loop selectedIndex={dayIndex} onSelect={(index) => updateDate(base.year, base.month, index + 1)} />
            <DrumColumn items={months} loop selectedIndex={monthIndex} onSelect={(index) => updateDate(base.year, index + 1, base.day)} />
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
