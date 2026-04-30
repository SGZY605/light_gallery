"use client";

import { useRef } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

type DeleteShareButtonProps = {
  shareId: string;
  shareTitle: string;
  serverAction: (formData: FormData) => void;
};

export function DeleteShareButton({ shareId, shareTitle, serverAction }: DeleteShareButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={serverAction} className="hidden">
        <input type="hidden" name="shareId" value={shareId} />
      </form>
      <ConfirmDialog
        title={`删除分享记录「${shareTitle}」？`}
        description="该分享链接已不可用，删除后不会保留历史记录。此操作不可撤销。"
        confirmLabel="删除"
        onConfirm={() => formRef.current?.requestSubmit()}
      >
        <button
          type="button"
          className="px-2 py-0.5 text-[10px] text-red-400/50 transition hover:text-red-400/80"
        >
          删除记录
        </button>
      </ConfirmDialog>
    </>
  );
}
