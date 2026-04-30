"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import Link from "next/link";

export type LibraryFilterTag = {
  id: string;
  name: string;
};

type LibraryFilterBarProps = {
  query: string;
  selectedTagIds: string[];
  tags: LibraryFilterTag[];
};

function buildTagHref(selectedTagIds: string[], tagId: string, query: string) {
  const nextTagIds = selectedTagIds.includes(tagId)
    ? selectedTagIds.filter((id) => id !== tagId)
    : [...selectedTagIds, tagId];
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  nextTagIds.forEach((id) => {
    params.append("tag", id);
  });

  const qs = params.toString();
  return qs ? `/dashboard/library?${qs}` : "/dashboard/library";
}

export function LibraryFilterBar({ query, selectedTagIds, tags }: LibraryFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);


  // Close on Escape
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

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

  return (
    <div ref={containerRef} className="flex min-w-0 flex-1 justify-end">
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
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white/40 ring-1 ring-white/[0.06] transition hover:bg-black/40 hover:text-white/50"
          >
            <Search className="h-3.5 w-3.5" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scaleX: 0.6, scaleY: 0.8 }}
            animate={{ opacity: 1, scaleX: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleX: 0.6, scaleY: 0.8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformOrigin: "right" }}
            className="flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-black/20 px-3.5 py-1.5 backdrop-blur-md"
          >
            <form className="flex items-center gap-2">
              <input
                name="q"
                defaultValue={query}
                autoFocus
                className="w-28 bg-transparent px-2 py-0.5 text-xs text-white placeholder:text-white/15 outline-none transition focus:text-white/40"
                placeholder="搜索"
              />
              {selectedTagIds.map((tagId) => (
                <input key={tagId} type="hidden" name="tag" value={tagId} />
              ))}
              <button
                type="submit"
                className="flex items-center justify-center h-6 w-6 rounded-full bg-white/[0.06] text-white/45 transition hover:bg-white/10 hover:text-white/60"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>

            {tags.length > 0 && (
              <>
                <span className="h-3.5 w-px bg-white/10" />
                <div className="flex flex-wrap items-center gap-y-1">
                  {tags.map((tag, i) => {
                    const active = selectedTagIds.includes(tag.id);

                    return (
                      <div key={tag.id} className="flex items-center">
                        {i > 0 && <span className="h-3 w-px bg-white/[0.06]" />}
                        <Link
                          href={buildTagHref(selectedTagIds, tag.id, query)}
                          className={[
                            "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition",
                            active
                              ? "text-white bg-white/[0.18] ring-white/[0.15]"
                              : "text-white/25 bg-white/[0.02] ring-white/[0.04] hover:text-white/40 hover:bg-white/[0.04]"
                          ].join(" ")}
                        >
                          {tag.name}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
