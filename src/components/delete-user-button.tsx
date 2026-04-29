"use client";

import { useRef } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

type DeleteUserFormProps = {
  userId: string;
  userName: string;
  serverAction: (formData: FormData) => void;
};

export function DeleteUserForm({ userId, userName, serverAction }: DeleteUserFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={serverAction} className="hidden">
        <input type="hidden" name="userId" value={userId} />
      </form>
      <ConfirmDialog
        title={`删除用户「${userName}」？`}
        description="该用户的所有数据将转移至超级管理员账号。此操作不可撤销。"
        confirmLabel="删除"
        onConfirm={() => formRef.current?.requestSubmit()}
      >
        <button
          type="button"
          className="px-1.5 py-0.5 text-[10px] text-red-400/50 transition hover:text-red-400/80"
        >
          Delete
        </button>
      </ConfirmDialog>
    </>
  );
}
