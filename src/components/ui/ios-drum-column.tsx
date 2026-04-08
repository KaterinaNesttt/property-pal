import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ROW_HEIGHT = 36;
const PICKER_HEIGHT = ROW_HEIGHT * 5;
const EDGE_PADDING = ROW_HEIGHT * 2;
const LOOP_COPIES = 5;
const SETTLE_DELAY = 120;
const SMOOTH_UNLOCK_DELAY = 220;
const AUTO_UNLOCK_DELAY = 32;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mod = (value: number, base: number) => ((value % base) + base) % base;

interface IosDrumColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  loop?: boolean;
}

const IosDrumColumn = ({ items, selectedIndex, onSelect, loop = false }: IosDrumColumnProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);
  const unlockTimeoutRef = useRef<number | null>(null);
  const isProgrammaticRef = useRef(false);
  const activeIndexRef = useRef(0);
  const committedIndexRef = useRef(0);
  const lastItemsLengthRef = useRef(items.length);

  const safeSelectedIndex = items.length > 0 ? clamp(selectedIndex, 0, items.length - 1) : 0;
  const [activeIndex, setActiveIndex] = useState(safeSelectedIndex);

  const renderedItems = useMemo(
    () => (loop && items.length > 0 ? Array.from({ length: LOOP_COPIES }, () => items).flat() : items),
    [items, loop],
  );

  const middleOffset = loop && items.length > 0 ? items.length * Math.floor(LOOP_COPIES / 2) : 0;

  const setProgrammaticLock = useCallback((delay: number) => {
    isProgrammaticRef.current = true;
    if (unlockTimeoutRef.current) {
      window.clearTimeout(unlockTimeoutRef.current);
    }
    unlockTimeoutRef.current = window.setTimeout(() => {
      isProgrammaticRef.current = false;
    }, delay);
  }, []);

  const syncToIndex = useCallback((index: number, behavior: ScrollBehavior) => {
    const node = ref.current;
    if (!node || items.length === 0) {
      return;
    }

    const targetIndex = loop ? middleOffset + index : index;
    const targetTop = targetIndex * ROW_HEIGHT;

    if (Math.abs(node.scrollTop - targetTop) <= 1) {
      return;
    }

    setProgrammaticLock(behavior === "smooth" ? SMOOTH_UNLOCK_DELAY : AUTO_UNLOCK_DELAY);
    node.scrollTo({ top: targetTop, behavior });
  }, [items.length, loop, middleOffset, setProgrammaticLock]);

  const commitIndex = useCallback((index: number, behavior: ScrollBehavior = "auto") => {
    const normalizedIndex = items.length > 0 ? clamp(index, 0, items.length - 1) : 0;
    activeIndexRef.current = normalizedIndex;
    committedIndexRef.current = normalizedIndex;
    setActiveIndex(normalizedIndex);
    syncToIndex(normalizedIndex, behavior);
    onSelect(normalizedIndex);
  }, [items.length, onSelect, syncToIndex]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const itemsLengthChanged = lastItemsLengthRef.current !== items.length;
    lastItemsLengthRef.current = items.length;

    if (items.length === 0) {
      activeIndexRef.current = 0;
      committedIndexRef.current = 0;
      setActiveIndex(0);
      return;
    }

    const nextIndex = clamp(safeSelectedIndex, 0, items.length - 1);
    const shouldReset =
      itemsLengthChanged ||
      nextIndex !== committedIndexRef.current ||
      nextIndex !== activeIndexRef.current;

    if (!shouldReset) {
      return;
    }

    activeIndexRef.current = nextIndex;
    committedIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    syncToIndex(nextIndex, itemsLengthChanged ? "auto" : "smooth");
  }, [items.length, safeSelectedIndex, syncToIndex]);

  useEffect(
    () => () => {
      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current);
      }
      if (unlockTimeoutRef.current) {
        window.clearTimeout(unlockTimeoutRef.current);
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
          if (items.length === 0 || isProgrammaticRef.current) {
            return;
          }

          const node = event.currentTarget;
          const rawIndex = Math.round(node.scrollTop / ROW_HEIGHT);
          const normalizedIndex = loop ? mod(rawIndex, items.length) : clamp(rawIndex, 0, items.length - 1);

          if (activeIndexRef.current !== normalizedIndex) {
            activeIndexRef.current = normalizedIndex;
            setActiveIndex(normalizedIndex);
          }

          if (settleTimeoutRef.current) {
            window.clearTimeout(settleTimeoutRef.current);
          }

          settleTimeoutRef.current = window.setTimeout(() => {
            commitIndex(normalizedIndex, "auto");
          }, SETTLE_DELAY);
        }}
        style={{ height: PICKER_HEIGHT, paddingTop: EDGE_PADDING, paddingBottom: EDGE_PADDING }}
      >
        {renderedItems.map((item, index) => {
          const activeDisplayIndex = loop && items.length > 0 ? middleOffset + activeIndex : activeIndex;
          const distance = Math.abs(index - activeDisplayIndex);
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
                "flex h-9 w-full snap-center items-center justify-center px-2 text-center text-sm font-medium transition-all duration-200 ease-out [transform-style:preserve-3d] will-change-transform",
                textClass,
              )}
              onClick={() => commitIndex(loop && items.length > 0 ? mod(index, items.length) : index, "smooth")}
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

export default IosDrumColumn;
