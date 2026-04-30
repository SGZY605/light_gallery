import Link from "next/link";

export function OssConfigRequiredNotice() {
  return (
    <section className="mb-4 border border-amber-400/20 bg-amber-400/[0.04] px-4 py-3 text-sm text-amber-100/75">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-amber-100/90">需要配置个人 OSS</p>
          <p className="mt-1 text-xs text-amber-100/55">
            当前账号还没有可用的 OSS 配置。上传、图库预览和分享图片前，请先在设置页填写自己的存储配置。
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="shrink-0 text-xs font-semibold text-amber-100/80 underline underline-offset-4 hover:text-amber-100"
        >
          前往设置
        </Link>
      </div>
    </section>
  );
}
