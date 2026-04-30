"use client";

import { useRef, useState, type ReactNode } from "react";

type ConfirmDialogProps = {
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmationLabel?: string;
  confirmationText?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  children: ReactNode;
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "确认",
  confirmationLabel,
  confirmationText,
  cancelLabel = "取消",
  variant = "danger",
  onConfirm,
  children
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const requiresConfirmationText = typeof confirmationText === "string";
  const isConfirmDisabled = requiresConfirmationText && confirmInput === confirmationText ? false : requiresConfirmationText;

  function openDialog() {
    setConfirmInput("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleConfirm() {
    if (isConfirmDisabled) {
      return;
    }

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

          {requiresConfirmationText ? (
            <label className="block space-y-2">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {confirmationLabel ?? "输入名称以确认"}
              </span>
              <input
                value={confirmInput}
                onChange={(event) => setConfirmInput(event.target.value)}
                placeholder={confirmationLabel ?? "输入名称以确认"}
                className="w-full rounded-lg border border-[var(--border-color)] bg-transparent px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-faint)] focus:border-red-400/40 focus:ring-2 focus:ring-red-500/10"
              />
            </label>
          ) : null}

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
              disabled={isConfirmDisabled}
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
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
