"use client";

import { useRef, type ReactNode } from "react";

type ConfirmDialogProps = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  children: ReactNode;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  variant = "danger",
  onConfirm,
  children
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleConfirm() {
    closeDialog();
    onConfirm();
  }

  return (
    <>
      <span onClick={openDialog} className="inline-flex">
        {children}
      </span>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDialog();
        }}
        className="m-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-0 shadow-2xl backdrop:bg-[var(--overlay-bg)]"
      >
        <div className="w-80 space-y-4 p-5">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
            {description ? (
              <p className="text-xs leading-5 text-[var(--text-faint)]">{description}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-faint)] transition hover:bg-[var(--control-hover-bg)] hover:text-[var(--text-muted)]"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                variant === "danger"
                  ? "bg-red-500/15 text-red-400/80 hover:bg-red-500/25 hover:text-red-400"
                  : "bg-[var(--control-hover-bg)] text-[var(--text-muted)] hover:bg-[var(--border-color)] hover:text-[var(--text-primary)]"
              ].join(" ")}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
