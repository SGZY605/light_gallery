"use client";

import { useRef } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

type DeleteTagFormProps = {
  tagId: string;
  tagName: string;
  imageCount: number;
  shareCount: number;
  serverAction: (formData: FormData) => void;
};

export function DeleteTagForm({ tagId, tagName, imageCount, shareCount, serverAction }: DeleteTagFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasContent = imageCount > 0 || shareCount > 0;

  return (
    <>
      <form ref={formRef} action={serverAction} className="hidden">
        <input type="hidden" name="tagId" value={tagId} />
      </form>
      <ConfirmDialog
        title={`删除标签「${tagName}」？`}
        description={
          hasContent
            ? `该标签关联了 ${imageCount} 张图片和 ${shareCount} 个分享，删除后关联将被清除。此操作不可撤销。`
            : "此操作不可撤销。"
        }
        confirmLabel="删除"
        onConfirm={() => formRef.current?.requestSubmit()}
      >
        <button
          type="button"
          className="px-2 py-1 text-[10px] font-medium text-red-400/50 transition hover:text-red-400/80"
        >
          删除
        </button>
      </ConfirmDialog>
    </>
  );
}
