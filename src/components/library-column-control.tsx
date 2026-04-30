"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Columns3 } from "lucide-react";
import {
  clampLibraryColumnCount,
  MAX_LIBRARY_COLUMN_COUNT,
  MIN_LIBRARY_COLUMN_COUNT
} from "@/lib/library/columns";

type LibraryColumnControlProps = {
  columnCount: number;
  onColumnCountChange: (value: number) => void;
};

export function LibraryColumnControl({
  columnCount,
  onColumnCountChange
}: LibraryColumnControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const resolvedColumnCount = clampLibraryColumnCount(columnCount);

  isOpenRef.current = isOpen;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpenRef.current) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onColumnCountChange(clampLibraryColumnCount(Number(event.target.value)));
    },
    [onColumnCountChange]
  );

  return (
    <div ref={containerRef} className="shrink-0">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="collapsed"
            type="button"
            onClick={handleToggle}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/40 backdrop-blur-md ring-1 ring-white/[0.06] transition hover:bg-black/40 hover:text-white/50"
            aria-label="Adjust columns"
          >
            <Columns3 className="h-3.5 w-3.5" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scaleX: 0.6, scaleY: 0.8 }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleX: 0.6, scaleY: 0.8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformOrigin: "left" }}
            className="flex items-center gap-2 rounded-2xl bg-black/20 px-3.5 py-1.5 backdrop-blur-md"
          >
            <Columns3 className="h-3.5 w-3.5 shrink-0 text-white/40" />
            <input
              type="range"
              min={MIN_LIBRARY_COLUMN_COUNT}
              max={MAX_LIBRARY_COLUMN_COUNT}
              step={1}
              value={resolvedColumnCount}
              onChange={handleSliderChange}
              className="h-1 w-24 cursor-ew-resize accent-white md:w-28"
              aria-label="Library column count"
            />
            <span className="w-4 text-center text-xs font-medium tabular-nums text-white/45">
              {resolvedColumnCount}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
